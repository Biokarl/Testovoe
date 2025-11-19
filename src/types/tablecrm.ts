export type ReferenceKind =
  | 'payboxes'
  | 'organizations'
  | 'warehouses'
  | 'priceTypes'

export interface TableCrmListResponse<T> {
  data: T[]
  meta?: {
    total?: number
  }
}

export interface Contragent {
  id: string
  name: string
  phone?: string
}

export interface Warehouse {
  id: string
  name: string
}

export interface Paybox {
  id: string
  name: string
}

export interface Organization {
  id: string;
  type?: string;
  short_name?: string;
  full_name?: string;
  work_name?: string;
  prefix?: string;
  inn?: string;
  kpp?: string;
  okved?: string;
  okved2?: string;
  okpo?: string;
  ogrn?: string;
  org_type?: string;
  tax_type?: string;
  tax_percent?: number;
  registration_date?: number;
  updated_at?: number;
  created_at?: number;
}

export interface PriceType {
  id: string
  name: string
  currency?: string
}

export interface Product {
  id: string
  name: string
  sku?: string
  price: number
  rest?: number
}

export interface OrderProductInput {
  productId: string
  quantity: number
  price: number
  discount?: number
}

export interface OrderPayload {
  token: string
  clientId: string
  organizationId: string
  warehouseId: string
  payboxId: string
  priceTypeId: string
  products: OrderProductInput[]
  comment?: string
  mode: 'draft' | 'complete'
}

