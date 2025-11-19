import {
  mockClients,
  mockOrganizations,
  mockPayboxes,
  mockPriceTypes,
  mockProducts,
  mockWarehouses,
} from '../mocks/tablecrm'
import type {
  Contragent,
  OrderPayload,
  Paybox,
  PriceType,
  Product,
  TableCrmListResponse,
  Warehouse,
  Organization,
} from '../types/tablecrm'

const API_BASE =
  import.meta.env.VITE_TABLECRM_BASE_URL?.replace(/\/$/, '') || 'https://app.tablecrm.com'

const shouldMock =
  import.meta.env.VITE_USE_MOCKS === 'true' ||
  (import.meta.env.VITE_USE_MOCKS === undefined && import.meta.env.DEV)

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const withDelay = async <T>(data: T, ms = 400): Promise<T> => {
  await delay(ms)
  return data
}

const mockList = <T>(data: T[]) => withDelay<TableCrmListResponse<T>>({ data })

const coerceId = (value: string) => {
  const numeric = Number(value)
  return Number.isNaN(numeric) ? value : numeric
}

type PossibleListResponse<T> =
  | TableCrmListResponse<T>
  | T[]
  | {
      data?: T[]
      results?: T[]
      result?: T[]
      items?: T[]
      meta?: { total?: number }
      count?: number
    }

const hasProperty = <K extends PropertyKey>(
  value: unknown,
  property: K,
): value is Record<K, unknown> =>
  typeof value === 'object' && value !== null && property in value

const normalizeListResponse = <T>(payload: PossibleListResponse<T>): TableCrmListResponse<T> => {
  if (Array.isArray(payload)) {
    return { data: payload }
  }

  if (hasProperty(payload, 'data') && Array.isArray(payload.data)) {
    return { data: payload.data, meta: payload.meta }
  }

  if (hasProperty(payload, 'results') && Array.isArray(payload.results)) {
    return {
      data: payload.results,
      meta:
        payload.meta ??
        (hasProperty(payload, 'count') && typeof payload.count === 'number'
          ? { total: payload.count }
          : undefined),
    }
  }

  if (hasProperty(payload, 'result') && Array.isArray(payload.result)) {
    return {
      data: payload.result,
      meta:
        payload.meta ??
        (hasProperty(payload, 'count') && typeof payload.count === 'number'
          ? { total: payload.count }
          : undefined),
    }
  }

  if (hasProperty(payload, 'items') && Array.isArray(payload.items)) {
    return { data: payload.items, meta: payload.meta }
  }

  return { data: [] }
}

const buildUrl = (path: string, token: string, params?: Record<string, string>) => {
  const url = new URL(`${API_BASE}${path}`)
  url.searchParams.set('token', token)
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value) url.searchParams.set(key, value)
    })
  }
  return url.toString()
}

async function request<T>(path: string, token: string, params?: Record<string, string>) {
  if (!token) {
    throw new Error('Token is required')
  }

  const url = buildUrl(path, token, params)
  
  const response = await fetch(url)
  if (!response.ok) {
    const message = await response.text()
    console.error('API error response:', response.status, message)
    throw new Error(message || 'Не удалось загрузить данные')
  }

  const json = (await response.json()) as PossibleListResponse<T>
  return normalizeListResponse(json)
}

export const tableCrmApi = {
  fetchClients: (token: string, search?: string) => {
    if (shouldMock) {
      const filtered = search
        ? mockClients.filter(
            (client) =>
              client.phone?.replace(/\D/g, '').includes(search.replace(/\D/g, '')) ||
              client.name?.toLowerCase().includes(search.toLowerCase()),
          )
        : mockClients
      return mockList(filtered)
    }
    const params = search ? { search } : undefined
    return request<Contragent>(
      '/api/v1/contragents/',
      token,
      params,
    )
  },
  fetchWarehouses: (token: string) => {
    if (shouldMock) return mockList(mockWarehouses)
    return request<Warehouse>('/api/v1/warehouses/', token)
  },
  fetchPayboxes: (token: string) => {
    if (shouldMock) return mockList(mockPayboxes)
    return request<Paybox>('/api/v1/payboxes/', token)
  },
  fetchOrganizations: (token: string) => {
    if (shouldMock) return mockList(mockOrganizations)
    return request<Organization>('/api/v1/organizations/', token)
  },
  fetchPriceTypes: (token: string) => {
    if (shouldMock) return mockList(mockPriceTypes)
    return request<PriceType>('/api/v1/price_types/', token)
  },
  fetchProducts: (token: string, query?: string) => {
    if (shouldMock) {
      const list = query
        ? mockProducts.filter((product) =>
            product.name.toLowerCase().includes(query.toLowerCase()),
          )
        : mockProducts
      return mockList(list)
    }
    const params = query ? { search: query } : undefined
    return request<Product>('/api/v1/nomenclature/', token, params)
  },
  createSale: async (payload: OrderPayload) => {
    if (shouldMock) {
      await withDelay(null, 600)
      return { ok: true }
    }

    const url = `${API_BASE}/api/v1/docs_sales/?token=${payload.token}`
    const body = [{
      comment: payload.comment,
      client: coerceId(payload.clientId),
      organization: coerceId(payload.organizationId),
      warehouse: coerceId(payload.warehouseId),
      paybox: coerceId(payload.payboxId),
      mode: payload.mode,
      products: payload.products.map((item) => ({
        good: item.productId,
        quantity: item.quantity,
        price: item.price,
      })),
    }]

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const message = await response.text()
      throw new Error(message || 'Не удалось создать продажу')
    }

    return response.json()
  },
}
