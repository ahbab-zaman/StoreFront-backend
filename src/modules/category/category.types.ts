import { CategoryStatus } from "@prisma/client";

export interface CreateCategoryDTO {
  name: string;
  slug?: string;
  icon?: string;
  status?: CategoryStatus;
}

export interface UpdateCategoryDTO {
  name?: string;
  icon?: string;
}

export interface CategoryQuery {
  page?: number;
  limit?: number;
  search?: string;
}
