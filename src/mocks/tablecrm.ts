import type {
  Contragent,
  Organization,
  Paybox,
  PriceType,
  Product,
  Warehouse,
} from '../types/tablecrm'

const randomId = () => crypto.randomUUID()

export const mockClients: Contragent[] = [
  { id: randomId(), name: 'ООО "Продукты +"', phone: '+79998887766' },
  { id: randomId(), name: 'ИП Иванов Сергей', phone: '+79990001122' },
  { id: randomId(), name: 'ООО "МегаТех"', phone: '+79995556644' },
]

export const mockWarehouses: Warehouse[] = [
  { id: randomId(), name: 'Основной склад' },
  { id: randomId(), name: 'Интернет-магазин' },
]

export const mockPayboxes: Paybox[] = [
  { id: randomId(), name: 'Касса №1' },
  { id: randomId(), name: 'Касса №2' },
]

export const mockOrganizations: Organization[] = [
  { id: randomId(), name: 'ООО "Торговый дом"' },
  { id: randomId(), name: 'ООО "Розница"' },
]

export const mockPriceTypes: PriceType[] = [
  { id: randomId(), name: 'Розничная', currency: 'RUB' },
  { id: randomId(), name: 'Опт', currency: 'RUB' },
]

export const mockProducts: Product[] = [
  { id: randomId(), name: 'Колонка JBL Mini', sku: 'JBL-001', price: 3990, rest: 25 },
  { id: randomId(), name: 'Наушники AirSound', sku: 'AS-123', price: 5990, rest: 12 },
  { id: randomId(), name: 'Умные часы FitWatch', sku: 'FW-456', price: 9990, rest: 8 },
]

