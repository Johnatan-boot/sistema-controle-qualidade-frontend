export interface ICatalogItem {
  id: number;
  name: string;
}

export interface IProductItem {
  id: number;
  name: string;
  sku: string;
  supplier_id: number | null;
  supplier_name?: string;
}

export interface IQualityRecord {
  id: number;
  sector_id: number;
  status_id: number;
  divergence_type_id: number;
  product_id: number | null;
  supplier_id: number | null;
  quantity: number;
  observation: string;
  correction_action: string;
  observation_date: string;
  correction_date: string | null;
  responsible: string;

  sector_name?: string;
  status_name?: string;
  divergence_type_name?: string;
  product_name?: string;
  product_sku?: string;
  supplier_name?: string;
}

export interface IApiResponse<T> {
  success: boolean;
  data: T;
}
