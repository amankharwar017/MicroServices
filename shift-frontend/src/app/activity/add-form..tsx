import { useState, useEffect } from "react";
import type { ChangeEvent } from "react";
import { Box, Button, CardContent, Card, Paper, Typography } from "@mui/material";
import AddBoxOutlinedIcon from "@mui/icons-material/AddBoxOutlined";
import AttachFileOutlinedIcon from "@mui/icons-material/AttachFileOutlined";
import TextField from "../../components/TextField";
import TextArea from "../../components/TextArea";
import MultiselectAutoComplete from "../../components/MultiselectAutoComplete";
import Attachment from "../../components/Attachment";
import DeleteIcon from "@mui/icons-material/Delete";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import { saveMultipleShifts } from "../shift-api";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch } from "../../redux/store";
import { fetchShiftDropdownOptions, selectFreshDropdownOptions, } from "../../redux/cacheSlice";
import type { DropdownOptionResponse } from "../../types/shift";
import { shiftValidationSchema } from "../shift-validation";
import type { ShiftFormData } from "../../types/shift";

interface AddShiftFormProps {
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
  onBack: () => void;
}

export const initialFormData: ShiftFormData = {
  shiftCode: "",
  shiftName: "",
  displayName: "",
  shiftType: "-",
  startTime: "",
  endTime: "",
  breakStart: "",
  breakEnd: "",
  graceIn: null,
  graceOut: null,
  overtimeAllowed: false,
  nightShift: false,
  weeklyOff: false,
  shiftColor: "#000000",
  applicableDays: [],
  description: "",
  attachment: "",
  remarks: "",
  status: true,
};

function AddShiftForm({ onSuccess, onError, onBack }: AddShiftFormProps) {
  const dispatch = useDispatch<AppDispatch>();
  const dropdownOptions = useSelector(selectFreshDropdownOptions);
  const [shifts, setShifts] = useState<ShiftFormData[]>([{ ...initialFormData }]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedFiles, setSelectedFiles] = useState<(File | null)[]>([null]);
  const [attachmentKey, setAttachmentKey] = useState(0);
  const [shiftTypeOptions, setShiftTypeOptions] = useState<{ label: string; value: string }[]>([]);
  const [dayOptions, setDayOptions] = useState<{ label: string; value: string }[]>([]);
  const [overtimeOptions, setOvertimeOptions] = useState<{ label: string; value: string }[]>([]);
  const [nightShiftOptions, setNightShiftOptions] = useState<{ label: string; value: string }[]>([]);
  const [weeklyOffOptions, setWeeklyOffOptions] = useState<{ label: string; value: string }[]>([]);
  const [statusOptions, setStatusOptions] = useState<{ label: string; value: string }[]>([]);

  useEffect(() => {
    void dispatch(fetchShiftDropdownOptions());
  }, [dispatch]);

  useEffect(() => {
    if (!dropdownOptions) return;

    const mapOptions = (options: DropdownOptionResponse[]) =>
      options.map((option) => ({
        label: option.name === "ALL" ? "All" : option.name,
        value: option.name,
      }));

    setShiftTypeOptions(mapOptions(dropdownOptions.shiftTypes));
    setDayOptions(mapOptions(dropdownOptions.applicableDays));

    setOvertimeOptions(
      dropdownOptions.overtimeOptions.map((option) => ({
        label: option.name,
        value: option.name.toLowerCase() === "yes" ? "true" : "false",
      }))
    );

    setNightShiftOptions(
      dropdownOptions.nightShiftOptions.map((option) => ({
        label: option.name,
        value: option.name.toLowerCase() === "yes" ? "true" : "false",
      }))
    );

    setWeeklyOffOptions(
      dropdownOptions.weeklyOffOptions.map((option) => ({
        label: option.name,
        value: option.name.toLowerCase() === "yes" ? "true" : "false",
      }))
    );

    setStatusOptions(
      dropdownOptions.statusOptions.map((option) => ({
        label: option.name,
        value: option.name.toLowerCase() === "active" ? "true" : "false",
      }))
    );
  }, [dropdownOptions]);
  const updateField = (index: number, name: keyof ShiftFormData, value: unknown) => {
    setShifts((previous) => previous.map((shift, i) => i === index ? { ...shift, [name]: value } : shift));
    setErrors((previous) => ({ ...previous, [`${index}-${name}`]: "" }));
  };

  const handleChange = (index: number, event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    updateField(index, name as keyof ShiftFormData, value);
  };

  const handleNumberChange = (index: number, event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    updateField(index, name as keyof ShiftFormData, value === "" ? null : Number(value));
  };

  const handleFileChange = (index: number, file: File | null) => {
    setSelectedFiles((previous) => previous.map((item, i) => i === index ? file : item));
    updateField(index, "attachment", file?.name ?? "");
  };

  const handleAddNewShift = () => {
    setShifts((previous) => [...previous, { ...initialFormData, applicableDays: [] }]);
    setSelectedFiles((previous) => [...previous, null]);
  };

  const handleRemoveShift = (index: number) => {
    setShifts((previous) => previous.filter((_, i) => i !== index));
    setSelectedFiles((previous) => previous.filter((_, i) => i !== index));
    setErrors({});
  };

  const handleReset = () => {
    setShifts([{ ...initialFormData, applicableDays: [] }]);
    setSelectedFiles([null]);
    setAttachmentKey((previous) => previous + 1);
    setErrors({});
  };

  const text = (index: number, label: string, name: keyof ShiftFormData, type = "text", required = false) => (<TextField label={label} name={name} value={String(shifts[index][name] ?? "")} onChange={(event) => handleChange(index, event)} type={type} required={required} error={Boolean(errors[`${index}-${name}`])} helperText={errors[`${index}-${name}`]} />);

  const submitValidForm = async () => {
    setErrors({});
    const payload: unknown[] = [];
    const validationErrors: Record<string, string> = {};

    for (let index = 0; index < shifts.length; index++) {
      try {
        const validatedShift = await shiftValidationSchema.validate(shifts[index], { abortEarly: false });
        payload.push({
          ...validatedShift,
          displayName: validatedShift.displayName || null,
          breakStart: validatedShift.breakStart || null,
          breakEnd: validatedShift.breakEnd || null,
          shiftColor: validatedShift.shiftColor || null,
          applicableDays: validatedShift.applicableDays?.map((day) => day?.toUpperCase() ?? "") ?? [],
          description: validatedShift.description || null,
          attachment: validatedShift.attachment || null,
          remarks: validatedShift.remarks || null,
        });
      } catch (error: unknown) {
        if (error instanceof Error && "inner" in error) {
          const validationError = error as { inner?: Array<{ path?: string; message: string }> };
          validationError.inner?.forEach((item) => {
            if (item.path && !validationErrors[`${index}-${item.path}`]) {
              validationErrors[`${index}-${item.path}`] = item.message;
            }
          });
        } else {
          onError("Failed to validate shift details.");
          return;
        }
      }
    }
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    try {
      const response = await saveMultipleShifts(payload);
      onSuccess(response.data?.message ?? "Shifts saved successfully.");
      handleReset();
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { message?: string; error?: Record<string, string> } }; };
      const backendErrors = axiosError.response?.data?.error;
      if (backendErrors) {
        const mappedErrors: Record<string, string> = {};
        Object.entries(backendErrors).forEach(([field, message]) => { mappedErrors[`0-${field}`] = message; });
        setErrors(mappedErrors);
      }
      onError(axiosError.response?.data?.message ?? "Failed to save shifts.");
    }
  };

  return (
    <Paper elevation={0} className="shift-form-card">
      <form onSubmit={(event) => { event.preventDefault(); void submitValidForm(); }} noValidate>
        <Box className="shift-form-header" sx={{ backgroundColor: "#000000", color: "#ffffff", padding: "16px 20px" }}>
          <Box className="shift-form-heading-icon">
            <AddBoxOutlinedIcon />
          </Box>
          <Box className="shift-form-heading-text" sx={{ color: "#ffffff" }}>
            <Typography variant="h6">Add Shift</Typography>
          </Box>
        </Box>
        {shifts.map((shift, index) => (
          <Box key={index} sx={{ mb: 2 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", px: 2, py: 1 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Shift {index + 1}</Typography>
              {shifts.length > 1 && (<Tooltip title="Delete Shift"><IconButton type="button" color="error" size="small" onClick={() => handleRemoveShift(index)} aria-label={`Delete Shift ${index + 1}`}><DeleteIcon /></IconButton></Tooltip>)}
            </Box>
            <Card elevation={0} className="shift-search-card" sx={{ backgroundColor: "#ffffff !important" }}>
              <CardContent className="shift-search-card-content" sx={{ backgroundColor: "#ffffff !important" }}>
                <Box className="shift-form-fields">
                  {text(index, "Shift Code", "shiftCode", "text", true)}
                  {text(index, "Shift Name", "shiftName", "text", true)}
                  {text(index, "Display Name", "displayName")}
                  <MultiselectAutoComplete label="Shift Type" name="shiftType" value={shift.shiftType} options={shiftTypeOptions} multiple={false} onChange={(value) => updateField(index, "shiftType", Array.isArray(value) ? value[0] ?? "" : value)} required error={Boolean(errors[`${index}-shiftType`])} helperText={errors[`${index}-shiftType`]} />
                  {text(index, "Start Time", "startTime", "time", true)}
                  {text(index, "End Time", "endTime", "time", true)}
                  {text(index, "Break Start", "breakStart", "time")}
                  {text(index, "Break End", "breakEnd", "time")}
                  <TextField label="Grace In" name="graceIn" value={shift.graceIn === null ? "" : String(shift.graceIn)} onChange={(event) => handleNumberChange(index, event)} type="number" error={Boolean(errors[`${index}-graceIn`])} helperText={errors[`${index}-graceIn`]} />
                  <TextField label="Grace Out" name="graceOut" value={shift.graceOut === null ? "" : String(shift.graceOut)} onChange={(event) => handleNumberChange(index, event)} type="number" error={Boolean(errors[`${index}-graceOut`])} helperText={errors[`${index}-graceOut`]} />
                  {text(index, "Shift Color", "shiftColor")}
                  <MultiselectAutoComplete label="Applicable Days" name="applicableDays" value={shift.applicableDays} options={dayOptions} multiple={true} onChange={(value) => { const selectedDays = Array.isArray(value) ? value : value ? [value] : []; const allDays = dayOptions.filter((day) => day.value !== "ALL").map((day) => day.value); updateField(index, "applicableDays", selectedDays.includes("ALL") ? (shift.applicableDays.length === allDays.length ? [] : allDays) : selectedDays); }} error={Boolean(errors[`${index}-applicableDays`])} helperText={errors[`${index}-applicableDays`]} />                </Box>
              </CardContent>
            </Card>
            <Box className="shift-form-checkboxes">
              <Box className="shift-form-option" sx={{ width: 120 }}>
                <MultiselectAutoComplete label="Overtime Allowed" name="overtimeAllowed" value={shift.overtimeAllowed ? "true" : "false"} options={overtimeOptions} multiple={false} disableClearable size="small" onChange={(value) => updateField(index, "overtimeAllowed", (Array.isArray(value) ? value[0] : value) === "true")} />
              </Box>
              <Box className="shift-form-option" sx={{ width: 120 }}>
                <MultiselectAutoComplete label="Night Shift" name="nightShift" value={shift.nightShift ? "true" : "false"} options={nightShiftOptions} multiple={false} disableClearable size="small" onChange={(value) => updateField(index, "nightShift", (Array.isArray(value) ? value[0] : value) === "true")} />
              </Box>
              <Box className="shift-form-option" sx={{ width: 120 }}>
                <MultiselectAutoComplete label="Weekly Off" name="weeklyOff" value={shift.weeklyOff ? "true" : "false"} options={weeklyOffOptions} multiple={false} disableClearable size="small" onChange={(value) => updateField(index, "weeklyOff", (Array.isArray(value) ? value[0] : value) === "true")} />
              </Box>
            </Box>
            <Box className="shift-form-textareas">
              <TextArea label="Description" name="description" value={shift.description} onChange={(event) => handleChange(index, event)} error={Boolean(errors[`${index}-description`])} helperText={errors[`${index}-description`]} minRows={4} />
              <TextArea label="Remarks" name="remarks" value={shift.remarks} onChange={(event) => handleChange(index, event)} error={Boolean(errors[`${index}-remarks`])} helperText={errors[`${index}-remarks`]} minRows={4} />
            </Box>
            <Box className="shift-form-attachment">
              <Box className="shift-form-attachment-row">
                <Box className="shift-form-field-icon shift-icon-blue">
                  <AttachFileOutlinedIcon />
                </Box>
                <Box className="shift-form-attachment-content">
                  <Attachment key={`${index}-${attachmentKey}`} label="Choose Attachment" accept=".pdf,.doc,.docx" onChange={(file) => handleFileChange(index, file)} />
                  {selectedFiles[index] && (<Typography variant="body2" className="shift-form-selected-file">Selected file: {selectedFiles[index]?.name}</Typography>)}
                  {errors[`${index}-attachment`] && (<Typography variant="caption" className="shift-form-attachment-error">{errors[`${index}-attachment`]}</Typography>)}
                </Box>
              </Box>
            </Box>
            <Box className="shift-form-status">
              <Box className="shift-form-status-control">
                <MultiselectAutoComplete label="Shift Status" name="status" value={shift.status ? "true" : "false"} options={statusOptions} multiple={false} onChange={(value) => updateField(index, "status", (Array.isArray(value) ? value[0] : value) === "true")} disableClearable />
              </Box>
            </Box>
          </Box>
        ))}
        <Box className="shift-form-actions" sx={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 1, flexWrap: "nowrap", width: "100%", boxSizing: "border-box", "& .MuiButton-root": { flexShrink: 0, whiteSpace: "nowrap", minWidth: "auto", height: 40, px: 2 } }}>
          <Button type="submit" variant="contained" className="shift-form-submit-button" sx={{ backgroundColor: "#15803d", color: "#ffffff", "&:hover": { backgroundColor: "#166534" } }}>Save Shift{shifts.length > 1 ? "s" : ""}</Button>
          <Button type="button" variant="contained" onClick={handleReset} sx={{ backgroundColor: "#eab308", color: "#111827", "&:hover": { backgroundColor: "#ca8a04" } }}>Reset</Button>
          <Button type="button" variant="contained" onClick={onBack} className="shift-form-back-button" sx={{ backgroundColor: "#dc2626", color: "#ffffff", "&:hover": { backgroundColor: "#b91c1c" } }}>Back</Button>
          <Button type="button" variant="contained" onClick={handleAddNewShift} startIcon={<AddBoxOutlinedIcon />} sx={{ backgroundColor: "#1976d2", color: "#ffffff", "&:hover": { backgroundColor: "#1565c0" } }}>Add More Shift</Button>
        </Box>
      </form>
    </Paper>
  );
}

export default AddShiftForm;
