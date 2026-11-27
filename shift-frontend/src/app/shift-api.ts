import type { ShiftDropdownOptionsResponse } from "../types/shift";
import axios from "axios";
const axiosInstance = axios.create({
  baseURL: "https://api-gateway-b427.onrender.com",
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

export interface ShiftAnalyticsFilterParams {
  shiftType?: string[];
  status?: boolean;
  nightShift?: boolean;
  createdDateFrom?: string;
  createdDateTo?: string;
}

export const getCreationTrends = async (
  level: "YEARLY" | "MONTHLY" | "WEEKLY" | "DAILY",
  filters: ShiftAnalyticsFilterParams = {}
) => {
  const params = Object.fromEntries(
    Object.entries({ level, ...filters }).filter(([, value]) => value !== undefined && value !== "")
  );
  return await axiosInstance.get("/shift/creation-trends", {
    params,
    paramsSerializer: { indexes: null },
  });
};

export const getDashboardCounts = () => axiosInstance.get("/shift/dashboard-counts");

export const getShiftSummary = async (
  filtersOrDateFrom?: ShiftAnalyticsFilterParams | string,
  dateTo?: string
) => {
  const filters: ShiftAnalyticsFilterParams =
    typeof filtersOrDateFrom === "object" && filtersOrDateFrom !== null
      ? filtersOrDateFrom
      : { createdDateFrom: filtersOrDateFrom, createdDateTo: dateTo };
  const params = Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== undefined && value !== "")
  );
  return axiosInstance.get("/shift/analytics", {
    params,
    paramsSerializer: { indexes: null },
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
