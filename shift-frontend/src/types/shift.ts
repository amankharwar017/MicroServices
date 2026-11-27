export interface ShiftFormData {
  shiftCode: string;
  shiftName: string;
  displayName: string;
  shiftType: string;
  startTime: string;
  endTime: string;
  breakStart: string;
  breakEnd: string;
  graceIn: number | null;
  graceOut: number | null;
  overtimeAllowed: boolean;
  nightShift: boolean;
  weeklyOff: boolean;
  shiftColor: string;
  applicableDays: string[];
  description: string;
  attachment: string;
  remarks: string;
  status: boolean;
}

export interface ShiftResponse {
  id: number;
  shiftCode: string;
  shiftName: string;
  displayName: string;
  shiftType: string;
  startTime: string;
  endTime: string;
  breakStart: string;
  breakEnd: string;
  workingHours: number;
  graceIn: number | null;
  graceOut: number | null;
  overtimeAllowed: boolean;
  nightShift: boolean;
  weeklyOff: boolean;
  shiftColor: string;
  applicableDays: string[];
  description: string;
  attachment: string;
  remarks: string;
  status: boolean;
  isDeleted : boolean;
  createdBy: string;
  createdAt: string;
  updatedBy: string;
  updatedAt: string;
}

export const shiftResponseHeaders: (keyof ShiftResponse)[] = [
  "id",
  "shiftCode",
  "shiftName",
  "displayName",
  "shiftType",
  "startTime",
  "endTime",
  "breakStart",
  "breakEnd",
  "workingHours",
  "graceIn",
  "graceOut",
  "overtimeAllowed",
  "nightShift",
  "weeklyOff",
  "shiftColor",
  "applicableDays",
  "description",
  "attachment",
  "remarks",
  "status",
  "createdBy",
  "createdAt",
  "updatedBy",
  "updatedAt"
];

export interface DropdownOptionResponse {
  id: number;
  name: string;
}

export interface ShiftDropdownOptionsResponse {
  shiftTypes: DropdownOptionResponse[];
  applicableDays: DropdownOptionResponse[];
  overtimeOptions: DropdownOptionResponse[];
  nightShiftOptions: DropdownOptionResponse[];
  weeklyOffOptions: DropdownOptionResponse[];
  statusOptions: DropdownOptionResponse[];
}