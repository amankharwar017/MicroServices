import type { ShiftDropdownOptionsResponse } from "../types/shift";
import axios from "axios";
const axiosInstance = axios.create({
  baseURL: "http://localhost:8086",
});
axiosInstance.interceptors.request.use(
  (config) => { const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);
export const saveMultipleShifts = async (shifts: unknown[]) => {
  return await axiosInstance.post("/shift/save-multiple", shifts);
};
export const getShiftList = async ( page = 0,size = 10,sort = "id,asc") => {
  return await axiosInstance.get("/shift/list", {params: {page,size,sort,},});
};
export const getShiftById = async (shiftId: number) => {
  return await axiosInstance.get(`/shift/${shiftId}`);
};
export const updateShift = async (shiftId: number, shiftData: unknown) => {
  return await axiosInstance.post("/shift/save-multiple", [{ ...shiftData as object, id: shiftId }]);
};
export const deleteShift = async (shiftId: number) => {
  return await axiosInstance.delete(`/shift/delete/${shiftId}`);
};
export const searchShifts = async (searchParams: Record<string, any>,page = 0,size = 10, sort = "id,asc") => {
  return await axiosInstance.post("/shift/search", null, {
    params: { ...searchParams, page, size, sort },
    paramsSerializer: {indexes: null},
  });
};
export const getShiftHistory = async (shiftId: number) => {
  return await axiosInstance.get(`/shift/history/${shiftId}`);
};
export const downloadShiftTemplate = async () => {
  return await axiosInstance.get("/common/shift/template", {  responseType: "blob", });
};
export const validateMultipleShifts = async (rows: unknown[]) =>axiosInstance.post("/common/shift/validate-multiple", rows);

export const getNotificationData = async (page: number = 0, size: number = 10) => {
    const response = await axiosInstance.get("/shift/notifications", {params: { page, size }});
    return response.data;
};
export const markNotificationAsRead = async (notificationId: number) => {
    return await axiosInstance.patch(`/shift/notifications/${notificationId}/read`);
};
export const markAllNotificationsAsRead = async () => {
    return await axiosInstance.patch("/shift/notifications/read-all");
};
export const getShiftDropdownOptions = async () => {
    return await axiosInstance.get<ShiftDropdownOptionsResponse>(
        "/shift/dropdown-options"
    );
};

export const getCreationTrends = async (level: "YEARLY" | "MONTHLY" | "WEEKLY" | "DAILY", dateFrom?: string, dateTo?: string) => {
  const params: Record<string, string> = { level };
  if (dateFrom) params.createdDateFrom = dateFrom;
  if (dateTo) params.createdDateTo = dateTo;
  return await axiosInstance.get("/shift/creation-trends", {
    params,
  });
};





export interface ShiftNotification {
  id: number;
  title: string;
  message: string;
  type: string;
  shiftId: number | null;
  isRead?: boolean;
  read?: boolean;
  createdAt: string;
}
