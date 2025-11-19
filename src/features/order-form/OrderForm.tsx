import { useEffect, useMemo, useState } from 'react'
import { tableCrmApi } from '../../api/tablecrm'
import { useDebounce } from '../../hooks/useDebounce'
import type {
  Contragent,
  Organization,
  Paybox,
  PriceType,
  Product,
  Warehouse,
} from '../../types/tablecrm'

type CartItem = Product & {
  quantity: number
  discount: number
}

const TOKEN_STORAGE_KEY = 'tablecrm_token'

const formatCurrency = (value: number) => {
  const numberValue = Number(value);
  if (isNaN(numberValue)) return 'нет цены';
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(numberValue);
};

const Section = ({
  title,
  action,
  children,
}: {
  title: string
  action?: React.ReactNode
  children: React.ReactNode
}) => (
  <section className="section-card">
    <header>
      <h2>{title}</h2>
      {action}
    </header>
    {children}
  </section>
)

function getOrganizationLabel(org: Organization) {
  return org.work_name && org.work_name.trim() ? org.work_name :
    org.short_name && org.short_name.trim() ? org.short_name :
    org.full_name && org.full_name.trim() ? org.full_name :
    org.type && org.type.trim() ? org.type :
    `ID: ${org.id}`;
}

const ReferenceSelect = <T extends { id: string; name?: string; short_name?: string; work_name?: string; full_name?: string; type?: string }>({
  label,
  options,
  value,
  onChange,
  placeholder,
  loading,
}: {
  label: string;
  options: T[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  loading?: boolean;
}) => (
  <label className="field">
    <span>{label}</span>
    <select value={value} onChange={e => onChange(e.target.value)} disabled={loading}>
      <option value="">{loading ? 'Загрузка...' : placeholder ?? 'Выберите значение'}</option>
      {options.map(option => (
        <option key={option.id} value={option.id}>
          {label === "Организация" ? getOrganizationLabel(option as Organization) : (option.name && option.name.trim() ? option.name : `ID: ${option.id}`)}
        </option>
      ))}
    </select>
  </label>
);

const safeOptions = <T extends { id: string }>(arr: T[] | undefined) =>
  Array.isArray(arr) ? arr.filter(o => !!o.id) : [];

export const OrderForm = () => {
  const [token, setToken] = useState('')
  const [tokenInput, setTokenInput] = useState('')
  const [tokenError, setTokenError] = useState('')
  const [tokenSavedMessage, setTokenSavedMessage] = useState('')

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [warehousesLoading, setWarehousesLoading] = useState(false);
  const [payboxes, setPayboxes] = useState<Paybox[]>([]);
  const [payboxesLoading, setPayboxesLoading] = useState(false);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [organizationsLoading, setOrganizationsLoading] = useState(false);
  const [priceTypes, setPriceTypes] = useState<PriceType[]>([]);
  const [priceTypesLoading, setPriceTypesLoading] = useState(false);

  const [selection, setSelection] = useState({
    warehouseId: '',
    payboxId: '',
    organizationId: '',
    priceTypeId: '',
  })

  const [clientPhone, setClientPhone] = useState('')
  const debouncedPhone = useDebounce(clientPhone)
  const [clients, setClients] = useState<Contragent[]>([])
  const [clientLoading, setClientLoading] = useState(false)
  const [selectedClientId, setSelectedClientId] = useState('')
  const [wasClientManuallySelected, setWasClientManuallySelected] = useState(false);

  const [productQuery, setProductQuery] = useState('')
  const debouncedProductQuery = useDebounce(productQuery, 300)
  const [productResults, setProductResults] = useState<Product[]>([])
  const [productLoading, setProductLoading] = useState(false)
  const [cart, setCart] = useState<CartItem[]>([])

  const [comment, setComment] = useState('')
  const [submitState, setSubmitState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [submitMessage, setSubmitMessage] = useState('')

  useEffect(() => {
    const savedToken = window.localStorage.getItem(TOKEN_STORAGE_KEY)
    if (savedToken) {
      setToken(savedToken)
      setTokenInput(savedToken)
      setTokenSavedMessage('Токен восстановлен из памяти')
    }
  }, [])

  useEffect(() => {
    if (!token) return
    Promise.allSettled([
      tableCrmApi.fetchWarehouses(token),
      tableCrmApi.fetchPayboxes(token),
      tableCrmApi.fetchOrganizations(token),
      tableCrmApi.fetchPriceTypes(token),
    ])
      .then((results) => {
        const [warehousesResult, payboxesResult, organizationsResult, priceTypesResult] = results
        if (warehousesResult.status === 'fulfilled') setWarehouses(warehousesResult.value.data)
        if (payboxesResult.status === 'fulfilled') setPayboxes(payboxesResult.value.data)
        if (organizationsResult.status === 'fulfilled')
          setOrganizations(organizationsResult.value.data)
        if (priceTypesResult.status === 'fulfilled') setPriceTypes(priceTypesResult.value.data)
      })
      .catch((error) => {
        console.error(error)
        setSubmitMessage('Не удалось загрузить справочники')
        setSubmitState('error')
      })
  }, [token]);

  // При смене токена полностью сбрасываем справочные данные
  useEffect(() => {
    setWarehouses([]); setPayboxes([]); setOrganizations([]); setPriceTypes([]);
  }, [token]);

  // Загрузка справочников с кэшированием
  useEffect(() => {
    if (!token) return;
    if (!warehouses.length) {
      setWarehousesLoading(true);
      tableCrmApi.fetchWarehouses(token).then(r => setWarehouses(r.data)).finally(() => setWarehousesLoading(false));
    }
    if (!payboxes.length) {
      setPayboxesLoading(true);
      tableCrmApi.fetchPayboxes(token).then(r => setPayboxes(r.data)).finally(() => setPayboxesLoading(false));
    }
    if (!organizations.length) {
      setOrganizationsLoading(true);
      tableCrmApi.fetchOrganizations(token).then(r => setOrganizations(r.data)).finally(() => setOrganizationsLoading(false));
    }
    if (!priceTypes.length) {
      setPriceTypesLoading(true);
      tableCrmApi.fetchPriceTypes(token).then(r => setPriceTypes(r.data)).finally(() => setPriceTypesLoading(false));
    }
  }, [token, warehouses.length, payboxes.length, organizations.length, priceTypes.length]);

  // КЛИЕНТЫ (выбор)
  const handleClientSelect = (client: Contragent) => {
    setSelectedClientId(client.id);
    setClientPhone(client.phone ?? '');
    setClients([]);
    setWasClientManuallySelected(true);
  };

  useEffect(() => {
    if (!token || debouncedPhone.trim().length < 2 || wasClientManuallySelected) {
      setClients([]);
      return;
    }
    const phoneToSend = debouncedPhone.trim();
    setClientLoading(true);
    tableCrmApi
      .fetchClients(token, phoneToSend === '' ? undefined : phoneToSend)
      .then((response) => {
        const q = phoneToSend.toLowerCase();
        const filtered = response.data.filter(c =>
          (c.name && c.name.toLowerCase().startsWith(q)) ||
          (c.phone && c.phone.replace(/\D/g, '').startsWith(q.replace(/\D/g, '')))
        );
        setClients(filtered);
      })
      .catch((error) => {
        console.error('Client search error:', error);
        setSubmitMessage('Ошибка поиска клиента');
        setSubmitState('error');
      })
      .finally(() => setClientLoading(false));
  }, [token, debouncedPhone, wasClientManuallySelected]);

  useEffect(() => {
    if (!token || debouncedProductQuery.trim().length < 2) {
      setProductResults([]);
      return;
    }
    setProductLoading(true);
    tableCrmApi
      .fetchProducts(token, debouncedProductQuery === '' ? undefined : debouncedProductQuery)
      .then((response) => {
        const q = debouncedProductQuery.trim().toLowerCase();
        const filtered = response.data.filter(
          p => (
            (p.name && p.name.toLowerCase().startsWith(q)) ||
            (p.sku && p.sku.toLowerCase().startsWith(q))
          )
        );
        setProductResults(filtered);
      })
      .catch((error) => {
        console.error(error);
        setSubmitMessage('Ошибка поиска товара');
        setSubmitState('error');
      })
      .finally(() => setProductLoading(false));
  }, [token, debouncedProductQuery]);

  const totals = useMemo(() => {
    const totalQuantity = cart.reduce((sum, item) => sum + item.quantity, 0)
    const totalAmount = cart.reduce(
      (sum, item) => sum + item.quantity * item.price * (1 - item.discount / 100),
      0,
    )
    return { totalQuantity, totalAmount }
  }, [cart])

  const handleTokenSave = () => {
    if (!tokenInput.trim()) {
      setTokenError('Введите токен кассы')
      return
    }
    setToken(tokenInput.trim())
    window.localStorage.setItem(TOKEN_STORAGE_KEY, tokenInput.trim())
    setTokenError('')
    setTokenSavedMessage('Токен сохранен')
  }

  const updateSelection = (field: keyof typeof selection, value: string) => {
    setSelection((prev) => ({ ...prev, [field]: value }))
  }

  const handleAddProduct = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id)
      if (existing) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item,
        )
      }
      return [...prev, { ...product, quantity: 1, discount: 0 }]
    })
    setProductQuery(''); // Очищаем поле поиска товара после выбора
  }

  const handleCartChange = (id: string, field: keyof CartItem, value: number) => {
    setCart((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: Number(value) } : item)),
    )
  }

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id))
  }

  const validateBeforeSubmit = () => {
    if (!token) return 'Введите токен кассы'
    if (!selectedClientId) return 'Выберите клиента'
    if (!selection.organizationId) return 'Укажите организацию'
    if (!selection.payboxId) return 'Выберите счет/кассу'
    if (!selection.warehouseId) return 'Укажите склад'
    if (!selection.priceTypeId) return 'Укажите тип цен'
    if (!cart.length) return 'Добавьте хотя бы один товар'
    return ''
  }

  const handleSubmit = async (mode: 'draft' | 'complete') => {
    const error = validateBeforeSubmit()
    if (error) {
      setSubmitState('error')
      setSubmitMessage(error)
      return
    }

    setSubmitState('loading')
    setSubmitMessage(mode === 'complete' ? 'Создаем и проводим...' : 'Создаем черновик...')

    try {
      await tableCrmApi.createSale({
        token,
        clientId: selectedClientId,
        organizationId: selection.organizationId,
        warehouseId: selection.warehouseId,
        payboxId: selection.payboxId,
        priceTypeId: selection.priceTypeId,
        products: cart.map((item) => ({
          productId: item.id,
          quantity: item.quantity,
          price: item.price,
          discount: item.discount,
        })),
        comment: comment.trim(),
        mode,
      })

      setSubmitState('success')
      setSubmitMessage(mode === 'complete' ? 'Продажа создана и проведена' : 'Черновик создан')
      if (mode === 'complete') {
        setCart([])
      }
    } catch (error) {
      console.error(error)
      setSubmitState('error')
      setSubmitMessage(error instanceof Error ? error.message : 'Ошибка создания продажи')
    }
  }

  return (
    <div className="order-form">
      <div className="mobile-container">
        <header className="page-header">
          <div>
            <p className="eyebrow">TableCRM</p>
            <h1>Создание продажи</h1>
          </div>
          <span className="badge">webapp</span>
        </header>

        <Section
          title="Авторизация кассы"
          action={
            token && (
              <span className="status-label success">
                <span className="dot" />
                Токен сохранен
              </span>
            )
          }
        >
          <div className="token-row">
            <input
              className={tokenError ? 'has-error' : ''}
              type="password"
              value={tokenInput}
              placeholder="Введите токен"
              onChange={(event) => setTokenInput(event.target.value)}
            />
            <button type="button" onClick={handleTokenSave}>
              Сохранить
            </button>
          </div>
          {(tokenError || tokenSavedMessage) && (
            <p className={tokenError ? 'helper error' : 'helper'}>{tokenError || tokenSavedMessage}</p>
          )}
        </Section>

        <Section title="Клиент">
          <label className="field">
            <span>Телефон</span>
            <input
              type="tel"
              placeholder="+7 (___) ___-__-__"
              value={clientPhone}
              onChange={(event) => {
                setClientPhone(event.target.value);
                setWasClientManuallySelected(false);
              }}
              disabled={!token}
            />
          </label>
          <div className="client-results">
            {clientLoading && <p className="helper">Поиск клиента...</p>}
            {!clientLoading && debouncedPhone && clients.length === 0 && (
              <p className="helper">Клиент не найден</p>
            )}
            {clients.map((client) => (
              <label key={client.id} className="radio-row" onClick={() => handleClientSelect(client)}>
                <input
                  type="radio"
                  name="client"
                  value={client.id}
                  checked={selectedClientId === client.id}
                  onChange={() => handleClientSelect(client)}
                />
                <div>
                  <p>{client.name}</p>
                  <span>{client.phone}</span>
                </div>
              </label>
            ))}
          </div>
        </Section>

        <Section title="Справочные данные">
          <div className="grid">
            <ReferenceSelect
              label="Счет / касса"
              options={safeOptions(payboxes)}
              value={selection.payboxId}
              onChange={(value) => updateSelection('payboxId', value)}
              loading={payboxesLoading}
            />
            <ReferenceSelect
              label="Организация"
              options={safeOptions(organizations)}
              value={selection.organizationId}
              onChange={(value) => updateSelection('organizationId', value)}
              loading={organizationsLoading}
            />
            <ReferenceSelect
              label="Склад"
              options={safeOptions(warehouses)}
              value={selection.warehouseId}
              onChange={(value) => updateSelection('warehouseId', value)}
              loading={warehousesLoading}
            />
            <ReferenceSelect
              label="Тип цены"
              options={safeOptions(priceTypes)}
              value={selection.priceTypeId}
              onChange={(value) => updateSelection('priceTypeId', value)}
              loading={priceTypesLoading}
            />
          </div>
        </Section>

        <Section title="Товары">
          <label className="field">
            <span>Поиск товара</span>
            <input
              type="search"
              placeholder="Введите название или артикул"
              value={productQuery}
              onChange={(event) => setProductQuery(event.target.value)}
              disabled={!token}
            />
          </label>
          <div className="product-results">
            {productLoading && <p className="helper">Поиск товаров...</p>}
            {!productLoading && debouncedProductQuery.trim().length >= 2 && productResults.length > 0 && (
              <ul>
                {productResults.map((product) => (
                  <li key={product.id}>
                    <div>
                      <strong>{product.name}</strong>
                      <p className="muted">
                        {product.sku} · {formatCurrency(product.price)}
                      </p>
                    </div>
                    <button type="button" onClick={() => handleAddProduct(product)}>
                      Добавить
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {cart.length > 0 && (
            <div className="cart">
              {cart.map((item) => (
                <div key={item.id} className="cart-row">
                  <div>
                    <p className="cart-title">{item.name}</p>
                    <span className="muted">
                      {formatCurrency(item.price)} × {item.quantity}
                    </span>
                  </div>
                  <div className="cart-controls">
                    <input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(event) => handleCartChange(item.id, 'quantity', Number(event.target.value))}
                    />
                    <input
                      type="number"
                      min={0}
                      max={item.price}
                      value={item.price}
                      onChange={(event) => handleCartChange(item.id, 'price', Number(event.target.value))}
                    />
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={item.discount}
                      onChange={(event) => handleCartChange(item.id, 'discount', Number(event.target.value))}
                    />
                    <button type="button" className="ghost" onClick={() => removeFromCart(item.id)}>
                      Удалить
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title="Итоги">
          <div className="summary">
            <div>
              <p className="muted">Позиций</p>
              <strong>{totals.totalQuantity}</strong>
            </div>
            <div>
              <p className="muted">На сумму</p>
              <strong>{formatCurrency(totals.totalAmount)}</strong>
            </div>
          </div>
          <label className="field">
            <span>Комментарий к заказу</span>
            <textarea
              rows={3}
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="Например, сборка и самовывоз"
            />
          </label>
        </Section>

        <div className="actions">
          <button type="button" className="ghost" onClick={() => handleSubmit('draft')}>
            Создать продажу
          </button>
          <button type="button" className="primary" onClick={() => handleSubmit('complete')}>
            Создать и провести
          </button>
        </div>

        {submitMessage && (
          <p className={`helper ${submitState === 'error' ? 'error' : 'success'}`}>
            {submitState === 'loading' && <span className="spinner" />}
            {submitMessage}
          </p>
        )}
      </div>
    </div>
  )
}

