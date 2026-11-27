/**
 * REST v1 identity / orders / palettes DTOs -> the portal's existing
 * (GraphQL-shaped) types, so components keep consuming Customer, Order,
 * OrderDetail, FabricPaletteDetail and SearchCustomerResult unchanged.
 *
 * Contract: furnisystems-backend docs/api/openapi.v1.json
 *   GET /auth/session, GET /me, GET /me/managed-customers,
 *   GET /me/orders, GET /me/orders/:id, GET /me/palettes
 * (DTOs: src/dto/{customers,orders,palettes}.dto.ts).
 *
 * Pure: no imports with side effects (scripts/verify-identity-v1.ts).
 */
import type {
  AdditionalComponentDetail,
  CartItemFabricDetail,
  Customer,
  CustomerFile,
  FabricImage,
  FabricPaletteDetail,
  Order,
  OrderDetail,
  OrderDetailAddress,
  OrderDetailImage,
  OrderDetailItem,
  OrdersQueryResult,
  SearchCustomerResult,
} from "./types"

// ---- wire types (camelCase, as served; nullable where the DTO allows) ----

type N<T> = T | null | undefined

export interface V1Image {
  id?: number
  src: string
  srcLg?: N<string>
  srcMd?: N<string>
  srcThumbnail?: N<string>
  srcXs?: N<string>
}

export interface V1Profile {
  id?: number
  language: string
  name: string
}

export interface V1PaletteRef {
  id: number
  name?: N<string>
  code?: N<string>
}

export interface V1MeFile {
  id: number
  name: string
  originalName?: N<string>
  mimeType?: N<string>
  sizeBytes?: N<number>
  displayOrder?: N<number>
  createdAt?: N<string>
  downloadUrl?: N<string>
}

export interface V1Me {
  id: number
  name: N<string>
  surname?: N<string>
  email: N<string>
  phone?: N<string>
  role: N<string>
  companyName: N<string>
  accountCode: N<string>
  priceListId: N<number>
  customerGroupId?: N<number>
  discount: N<number>
  deliveryTerms: N<string>
  language?: N<string>
  paletteIds?: N<number[]>
  tags: N<{ id: number; profiles?: N<V1Profile[]> }[]>
  fabricPalettes: N<V1PaletteRef[]>
  files: N<V1MeFile[]>
  customerGroup: N<{
    id?: number
    name?: N<string>
    priceListId?: N<number>
    fabricPalettes?: N<V1PaletteRef[]>
  }>
  features: N<{ configurator: boolean; claims: boolean; prices: boolean }>
  account: N<{
    id: string
    name: N<string>
    email: N<string>
    isPricesEnabled?: N<boolean>
    status?: N<string>
    subAccount?: N<{ id?: number; name: N<string> }>
  }>
  companyAddress: N<{ country?: N<string> }>
  managers: N<
    {
      id: number
      manager: N<{
        id?: number
        name: N<string>
        surname: N<string>
        email: N<string>
        phone?: N<string>
        role?: N<string>
        spokenLanguages?: N<string[]>
        image?: N<V1Image>
      }>
    }[]
  >
  additionalComponents: N<
    { id: number; code?: N<string>; group?: N<{ id?: N<number>; code?: N<string> }> }[]
  >
  acting?: N<{ customerId: number }>
}

export interface V1AuthSession {
  principal: {
    realm: "staff" | "portal" | string
    id: number
    role: string
    customerId?: N<number>
    customerAccountId?: N<string>
    subAccountId?: N<number>
    impersonatedBy?: N<number>
  }
  permissions: string[]
  session: { sid: string; kind: string; expiresAt: string; absoluteExpiresAt?: N<string> }
  features?: N<{ configurator: boolean; claims: boolean; prices: boolean }>
}

export interface V1PageMeta {
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
}

export interface V1ManagedCustomer {
  id: number
  name: N<string>
  surname: N<string>
  email: N<string>
  phone?: N<string>
  accountCode: N<string>
  companyName: N<string>
  customerGroupName: N<string>
  role: N<string>
  /** `?ids=...&expand=detail` only (ManagedCustomerDetail). */
  detail?: N<V1ManagedCustomerDetail>
}

/**
 * ManagedCustomerDetail: what GET /me + X-Acting-Customer-Id serves for
 * that customer (the acting-customer hydration fields; same sub-schemas).
 */
export interface V1ManagedCustomerDetail {
  deliveryTerms: N<string>
  priceListId: N<number>
  customerGroup: V1Me["customerGroup"]
  tags: V1Me["tags"]
  fabricPalettes: V1Me["fabricPalettes"]
  files: V1Me["files"]
  additionalComponents: V1Me["additionalComponents"]
}

export interface V1OrderListItem {
  id: string
  createdAt: string
  status: string
  type: N<string>
  code: string
  externalCode: N<string>
  number: N<number>
  confirmedDeliveryDate: N<string>
  preferredDeliveryDate?: N<string>
  totalPrice: N<number>
  totalPriceConfirmed: N<number>
  invoiceCode: N<string>
  hasInvoice: boolean
  invoiceUrl: N<string>
  purchasedBy: N<{ id?: number; name: N<string>; accountCode: N<string> }>
  login?: N<{ id: string; name: N<string>; subAccount?: N<{ name: N<string> }> }>
  subAccount: N<{ id?: number; name: N<string> }>
  items?: N<{ id: number; reference: N<string> }[]>
}

export interface V1OrderAddress {
  id?: number
  phone?: N<string>
  additionalPhone?: N<string>
  country?: N<string>
  city?: N<string>
  postalCode?: N<string>
  stateRegion?: N<string>
  address1?: N<string>
  address2?: N<string>
}

type V1ComponentProfile = { id?: number; language: string; name: N<string>; materialName?: N<string> }

export interface V1OrderComponent {
  id: number
  code?: N<string>
  groupId?: N<number>
  color?: N<{ id: number; hex?: N<string>; background?: N<string> }>
  dimensions?: N<{ width?: N<number>; height?: N<number>; length?: N<number> }>
  group?: N<{ id: number; code?: N<string>; profiles?: N<V1Profile[]> }>
  image?: N<V1Image>
  isWrapper?: N<boolean>
  linked?: N<
    {
      displayOrder?: N<number>
      id?: number
      linkType: string
      target: N<{ id: number; code: N<string>; image?: N<V1Image>; profiles?: N<V1ComponentProfile[]> }>
    }[]
  >
  profiles?: N<V1ComponentProfile[]>
}

export interface V1OrderDetailItem {
  id: number
  index?: N<number>
  reference: N<string>
  price: N<number>
  shippingPrice: N<number>
  quantity: N<number>
  sku: N<string>
  volume: N<number>
  status?: N<string>
  delayed?: N<boolean>
  expectedDeliveryDate?: N<string>
  preferredDeliveryDate?: N<string>
  configurations?: N<{ moduleCode: N<string>; moduleName: N<string>; price: N<number>; shapeType: N<string> }[][]>
  shippingMethod?: N<{ id: number; profiles?: N<{ id?: number; language: string; title: N<string> }[]> }>
  cartItem?: N<{
    id?: number
    advancedProductType?: N<string>
    productType?: N<string>
    selectedSofaCombinations?: N<string>
    fabricCode?: N<string>
    fabricColorName?: N<string>
    fabricGroupName?: N<string>
    fabricCombination?: N<{ id?: number; image?: N<V1Image> }>
    fabrics?: N<
      {
        id: number
        fabricCode?: N<string>
        fabricColorName?: N<string>
        fabricGroupName?: N<string>
        fabric?: N<{ id: number; code?: N<string>; colorName?: N<string>; image?: N<V1Image> }>
        fabricGroup?: N<{ id: number; code?: N<string>; type?: N<string>; profiles?: N<V1Profile[]> }>
        combinationOption?: N<{ id?: number; profiles?: N<V1Profile[]> }>
      }[]
    >
    components?: N<V1OrderComponent[]>
    product?: N<{
      id?: number
      singleProduct?: N<{ id?: number; images?: N<V1Image[]>; profiles?: N<V1Profile[]> }>
      advancedProduct?: N<{
        id?: number
        images?: N<V1Image[]>
        profiles?: N<V1Profile[]>
        dimensions?: N<Record<string, N<number>>>
      }>
    }>
  }>
}

export interface V1OrderDetail extends Omit<V1OrderListItem, "items"> {
  billingAddress?: N<V1OrderAddress>
  shippingAddress?: N<V1OrderAddress>
  paymentMethod?: N<{ id: number; profiles?: N<{ id?: number; language: string; title: N<string> }[]> }>
  items?: N<V1OrderDetailItem[]>
  updatedAt?: N<string>
}

export interface V1PaletteFabricGroup {
  id: number
  name: N<string>
  colorCodes: N<string[]>
  colorOverrides: N<{ code: string; name?: N<string>; category?: N<string> }[]>
  fabricGroup: {
    id: number
    code: N<string>
    createdAt: N<string>
    type?: N<string>
    fabrics: N<
      {
        id: number
        code: string
        colorName: N<string>
        createdAt: N<string>
        order: N<number>
        image: N<{ id: number; src: string; srcMd?: N<string>; srcThumbnail?: N<string> }>
      }[]
    >
    profiles: N<{ id: number; language: string; name: string; description?: N<string> }[]>
    features: N<
      {
        id: number
        code: N<string>
        photo: N<{ id: number; src: string }>
        profiles: N<V1Profile[]>
        group: N<{ id: number; code: N<string>; profiles: N<V1Profile[]> }>
      }[]
    >
    priceCategories: N<{ id: number; groupNumber: number }[]>
    manufacturer: N<{ id: number; priceCategories: N<{ groupNumber: number }[]> }>
  }
}

export interface V1Palette {
  id: number
  name: string
  code: N<string>
  fabricGroups: N<V1PaletteFabricGroup[]>
}

// ---- helpers ----

const arr = <T>(v: N<T[]>): T[] => (Array.isArray(v) ? v : [])
const opt = <T>(v: N<T>): T | undefined => (v === null || v === undefined ? undefined : v)
/** Portal type stores some ids as strings (GraphQL Int arrived as number at runtime). */
const idRef = (p: V1PaletteRef) => ({ id: p.id as unknown as string })

function image(v: N<V1Image>): OrderDetailImage | undefined {
  if (!v || !v.src) return undefined
  return {
    src: v.src,
    ...(v.srcXs ? { src_xs: v.srcXs } : {}),
    ...(v.srcThumbnail ? { src_thumbnail: v.srcThumbnail } : {}),
  }
}

const tagProfiles = (p: N<V1Profile[]>) =>
  arr(p).map((x) => ({ name: x.name, language: x.language }))

function mapFiles(files: N<V1MeFile[]>): CustomerFile[] {
  return arr(files).map((f) => ({
    id: f.id,
    name: f.name,
    original_name: f.originalName ?? null,
    mime_type: f.mimeType ?? null,
    size_bytes: f.sizeBytes ?? null,
    display_order: f.displayOrder ?? null,
  }))
}

function mapAdditionalComponents(v: V1Me["additionalComponents"]) {
  return arr(v).map((c) => ({
    additionalComponent: {
      id: c.id,
      ...(c.code != null ? { code: c.code } : {}),
      additional_component_group: c.group
        ? {
            ...(c.group.id != null ? { id: c.group.id } : {}),
            ...(c.group.code != null ? { code: c.group.code } : {}),
          }
        : undefined,
    },
  }))
}

// ---- GET /me -> Customer (the GraphQL getMe mapping) ----

/**
 * `GET /me` (WITHOUT X-Acting-Customer-Id: the caller itself) -> the shape
 * mapGetMeResponseToCustomer produced from GraphQL getMe.
 *
 * Differences (deliberate, documented in the report):
 *   - customer_account = the session's own login (`account`); GraphQL took
 *     the customer's first `customer_accounts` row. `account` is null for
 *     impersonated / acting / admin-issued sessions -> the same "no account,
 *     fail open on prices" placeholder GraphQL used when there was none.
 *   - is_configurator_enabled / is_claims_enabled come from `features`
 *     (the server-computed flags).
 */
export function mapV1MeToCustomer(me: V1Me): Customer {
  const now = new Date().toISOString()
  const account = me.account
  return {
    id: me.id,
    created_at: now,
    updated_at: now,
    email: me.email ?? "",
    full_name: me.name || "",
    has_account: true,
    b2b_company_name: opt(me.companyName),
    account_code: opt(me.accountCode),
    price_listId: (me.priceListId ?? undefined) as unknown as string | undefined,
    group_price_listId: (me.customerGroup?.priceListId ?? null) as unknown as string | null,
    b2b_customer_discount: me.discount ?? null,
    delivery_terms: me.deliveryTerms ?? null,
    tags: arr(me.tags).map((t) => ({ id: t.id, tag_profiles: tagProfiles(t.profiles) })),
    fabric_palettes: arr(me.fabricPalettes).map(idRef),
    files: mapFiles(me.files),
    customer_group: me.customerGroup
      ? {
          name: me.customerGroup.name ?? null,
          price_listId: (me.customerGroup.priceListId ?? undefined) as unknown as string | undefined,
          fabric_palettes: arr(me.customerGroup.fabricPalettes).map(idRef),
        }
      : undefined,
    managers: arr(me.managers)
      .filter((m) => m.manager)
      .map((m) => ({
        id: m.id as unknown as string,
        manager: {
          name: m.manager!.name ?? "",
          surname: m.manager!.surname ?? "",
          email: m.manager!.email ?? "",
          ...(m.manager!.role != null ? { role: m.manager!.role } : {}),
          ...(m.manager!.phone != null ? { default_phone_number: m.manager!.phone } : {}),
          ...(m.manager!.spokenLanguages ? { spoken_languages: m.manager!.spokenLanguages } : {}),
          ...(m.manager!.image?.src
            ? { image: { src: m.manager!.image.src, src_md: m.manager!.image.srcMd ?? "" } }
            : {}),
        },
      })),
    is_configurator_enabled: me.features?.configurator ?? false,
    is_claims_enabled: me.features?.claims ?? false,
    role: opt(me.role),
    b2b_company_address: me.companyAddress
      ? { country: me.companyAddress.country ?? "" }
      : undefined,
    name: me.name || "",
    additional_components: mapAdditionalComponents(me.additionalComponents),
    customer_account: account
      ? {
          id: account.id,
          name: account.name ?? "",
          email: account.email ?? "",
          shop: account.subAccount?.name ?? "",
          is_prices_enabled: account.isPricesEnabled ?? true,
        }
      : {
          id: undefined as unknown as string,
          name: "",
          email: "",
          shop: "",
          // No account on the session (agent / impersonation): fail open.
          is_prices_enabled: true,
        },
  }
}

// ---- GET /me + X-Acting-Customer-Id -> SearchCustomerResult (acting) ----

/** The acting customer (GraphQL: searchCustomers({ ids: [id] })[0]). */
export function mapV1MeToActingCustomer(me: V1Me): SearchCustomerResult {
  return {
    id: me.id,
    name: me.name ?? "",
    surname: me.surname ?? null,
    email: me.email ?? null,
    account_code: me.accountCode ?? null,
    b2b_company_name: me.companyName ?? null,
    price_listId: me.priceListId ?? null,
    group_price_listId: (me.customerGroup?.priceListId ?? null) as unknown as string | null,
    role: me.role ?? null,
    delivery_terms: me.deliveryTerms ?? null,
    tags: arr(me.tags).map((t) => ({ id: t.id, tag_profiles: tagProfiles(t.profiles) })),
    fabric_palettes: arr(me.fabricPalettes).map(idRef),
    files: mapFiles(me.files),
    customer_group: me.customerGroup
      ? {
          name: me.customerGroup.name ?? null,
          price_listId: (me.customerGroup.priceListId ?? undefined) as unknown as string | undefined,
          fabric_palettes: arr(me.customerGroup.fabricPalettes).map(idRef),
        }
      : undefined,
    additional_components: mapAdditionalComponents(me.additionalComponents),
  }
}

// ---- GET /me/managed-customers -> SearchCustomerResult[] (selector rows) ----

/**
 * Selector rows. The v1 row is slim (no tags / price lists / files /
 * palettes / components): the acting context re-hydrates the picked customer
 * through GET /me + X-Acting-Customer-Id (getActingCustomerForSelector).
 */
export function mapV1ManagedCustomer(c: V1ManagedCustomer): SearchCustomerResult {
  return {
    id: c.id,
    name: c.name ?? "",
    surname: c.surname ?? null,
    email: c.email ?? null,
    account_code: c.accountCode ?? null,
    b2b_company_name: c.companyName ?? null,
    price_listId: null,
    group_price_listId: null,
    role: c.role ?? null,
    customer_group: c.customerGroupName != null ? { name: c.customerGroupName } : undefined,
  }
}

/**
 * A hydrated selector row (`?ids=...&expand=detail`): row + detail, the same
 * SearchCustomerResult mapV1MeToActingCustomer builds from GET /me with the
 * acting header. A row without `detail` maps like a slim selector row.
 */
export function mapV1ManagedCustomerDetailed(
  c: V1ManagedCustomer
): SearchCustomerResult {
  const d = c.detail
  if (!d) return mapV1ManagedCustomer(c)
  return mapV1MeToActingCustomer({
    id: c.id,
    name: c.name ?? null,
    surname: c.surname ?? null,
    email: c.email ?? null,
    phone: c.phone ?? null,
    role: c.role ?? null,
    companyName: c.companyName ?? null,
    accountCode: c.accountCode ?? null,
    priceListId: d.priceListId ?? null,
    discount: null,
    deliveryTerms: d.deliveryTerms ?? null,
    tags: d.tags,
    fabricPalettes: d.fabricPalettes,
    files: d.files,
    customerGroup: d.customerGroup,
    features: null,
    account: null,
    companyAddress: null,
    managers: null,
    additionalComponents: d.additionalComponents,
  })
}

// ---- orders ----

function orderBase(o: V1OrderListItem | V1OrderDetail): Order {
  return {
    id: o.id,
    display_id: o.externalCode || o.code,
    created_at: o.createdAt,
    updated_at: o.createdAt,
    order_status: o.status,
    confirmed_delivery_date: opt(o.confirmedDeliveryDate),
    // Order.metadata is not served by v1 (the portal reads no key of it).
    metadata: {},
    total_price_confirmed: opt(o.totalPriceConfirmed),
    total_price: o.totalPrice ?? 0,
    order_code: o.code,
    order_number: (o.number ?? undefined) as unknown as string,
    invoice_code: opt(o.invoiceCode),
    // Only its truthiness is read ("an invoice PDF exists"); the link always
    // goes through the portal proxy /api/orders/:id/invoice. Never expose
    // the backend path.
    invoice_pdf_url: o.hasInvoice ? `/api/orders/${encodeURIComponent(o.id)}/invoice` : undefined,
    order_type: opt(o.type),
    order_external_code: opt(o.externalCode),
    purchased_subAccount: o.subAccount ? { name: o.subAccount.name ?? "" } : undefined,
    purchased_by: o.purchasedBy
      ? { name: o.purchasedBy.name ?? "", account_code: o.purchasedBy.accountCode ?? "" }
      : undefined,
  }
}

export function mapV1OrderListItem(o: V1OrderListItem): Order {
  const refs = arr(o.items)
  return {
    ...orderBase(o),
    items: refs.map((item) => ({
      id: "",
      created_at: o.createdAt,
      updated_at: o.createdAt,
      title: "",
      quantity: 1,
      unit_price: 0,
      total: 0,
      variant_id: "",
      product_id: "",
      reference: item.reference ?? undefined,
    })),
    order_item_references: refs
      .map((item) => item.reference)
      .filter((ref): ref is string => Boolean(ref)),
  }
}

export function mapV1OrderPage(
  body: { data: N<V1OrderListItem[]>; meta: N<V1PageMeta> },
  requestedPageSize: number
): OrdersQueryResult {
  const meta = body.meta
  const page = meta?.page ?? 1
  const totalPages = meta?.totalPages ?? 0
  return {
    orders: arr(body.data).map(mapV1OrderListItem),
    totalCount: meta?.totalCount ?? 0,
    currentPage: page,
    totalPages,
    pageSize: meta?.pageSize ?? requestedPageSize,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  }
}

function address(a: N<V1OrderAddress>): OrderDetailAddress | undefined {
  if (!a) return undefined
  return {
    id: opt(a.id),
    phone_number: opt(a.phone),
    country: opt(a.country),
    city: opt(a.city),
    postal_code: opt(a.postalCode),
    state_region: opt(a.stateRegion),
    address_1: opt(a.address1),
    address_2: opt(a.address2),
  }
}

const titled = (p: N<{ language: string; title: N<string> }[]>) =>
  arr(p).map((x) => ({ title: x.title ?? "", language: x.language }))

const named = (p: N<V1Profile[]>) => arr(p).map((x) => ({ name: x.name, language: x.language }))

const DIMENSION_KEYS: Record<string, string> = {
  width: "width",
  height: "height",
  length: "length",
  seatHeight: "seat_height",
  seatWidth: "seat_width",
  seatDepth: "seat_depth",
  headboardHeight: "headboard_height",
  headboardWidth: "headboard_width",
  mattressWidth: "mattress_width",
  mattressLength: "mattress_length",
  // The GraphQL column name really is misspelt.
  tableExtendedLength: "table_extended_lengh",
  tableTopThickness: "table_top_thickness",
  tableLegWidth: "table_leg_width",
  shadeHeight: "shade_height",
  shadeRadius: "shade_radius",
}

function dimensions(d: N<Record<string, N<number>>>) {
  if (!d) return null
  const out: Record<string, number | null> = {}
  Object.keys(DIMENSION_KEYS).forEach((k) => {
    if (k in d) out[DIMENSION_KEYS[k]] = d[k] ?? null
  })
  return out
}

function component(c: V1OrderComponent): AdditionalComponentDetail {
  const img = image(c.image)
  return {
    id: c.id,
    additionalComponentGroupId: (c.groupId ?? c.group?.id ?? 0) as number,
    ...(c.code != null ? { code: c.code } : {}),
    additional_component_profiles: arr(c.profiles).map((p) => ({
      name: p.name ?? "",
      ...(p.materialName != null ? { material_name: p.materialName } : {}),
      language: p.language,
    })),
    ...(img ? { image: { src: img.src, ...(img.src_thumbnail ? { src_thumbnail: img.src_thumbnail } : {}) } } : {}),
    ...(c.color
      ? { color: { id: c.color.id, ...(c.color.hex != null ? { hex: c.color.hex } : {}), ...(c.color.background != null ? { background: c.color.background } : {}) } }
      : {}),
    ...(c.group
      ? {
          additional_component_group: {
            id: c.group.id,
            ...(c.group.code != null ? { code: c.group.code } : {}),
            additional_component_group_profiles: named(c.group.profiles),
          },
        }
      : {}),
    dimensions: c.dimensions
      ? { width: c.dimensions.width ?? null, height: c.dimensions.height ?? null, length: c.dimensions.length ?? null }
      : null,
    is_wrapper: c.isWrapper ?? null,
    linked_components_source: arr(c.linked)
      .filter((l) => l.target)
      .map((l) => ({
        display_order: l.displayOrder ?? null,
        link_type: l.linkType,
        target_component: {
          id: l.target!.id,
          code: l.target!.code ?? null,
          image: l.target!.image
            ? { src: l.target!.image.src ?? null, src_thumbnail: l.target!.image.srcThumbnail ?? null }
            : null,
          additional_component_profiles: arr(l.target!.profiles).map((p) => ({
            name: p.name ?? null,
            material_name: p.materialName ?? null,
            language: p.language,
          })),
        },
      })),
  }
}

function fabricsOf(list: NonNullable<NonNullable<V1OrderDetailItem["cartItem"]>["fabrics"]>): CartItemFabricDetail[] {
  return list.map((f) => {
    const img = image(f.fabric?.image)
    return {
      id: String(f.id),
      fabric_code: f.fabricCode ?? null,
      fabric_color_name: f.fabricColorName ?? null,
      fabric_group_name: f.fabricGroupName ?? null,
      ...(f.fabric
        ? {
            fabric: {
              id: String(f.fabric.id),
              ...(f.fabric.code != null ? { code: f.fabric.code } : {}),
              ...(f.fabric.colorName != null ? { color_name: f.fabric.colorName } : {}),
              ...(img ? { image: { src: img.src, ...(img.src_thumbnail ? { src_thumbnail: img.src_thumbnail } : {}) } } : {}),
            },
          }
        : {}),
      ...(f.fabricGroup
        ? {
            fabric_group: {
              id: String(f.fabricGroup.id),
              ...(f.fabricGroup.code != null ? { code: f.fabricGroup.code } : {}),
              ...(f.fabricGroup.type != null ? { type: f.fabricGroup.type } : {}),
              fabric_group_profiles: named(f.fabricGroup.profiles),
            },
          }
        : {}),
      ...(f.combinationOption
        ? { combination_option: { fabricCombinationOptionProfiles: named(f.combinationOption.profiles) } }
        : {}),
    }
  })
}

function images(list: N<V1Image[]>): OrderDetailImage[] {
  return arr(list)
    .map(image)
    .filter((i): i is OrderDetailImage => Boolean(i))
}

function detailItem(item: V1OrderDetailItem): OrderDetailItem {
  const ci = item.cartItem
  const product = ci?.product
  const combinationImage = image(ci?.fabricCombination?.image)
  return {
    id: String(item.id),
    ...(item.reference != null ? { reference: item.reference } : {}),
    price: item.price ?? 0,
    shipping_price: item.shippingPrice ?? 0,
    quantity: item.quantity ?? 0,
    ...(item.sku != null ? { sku: item.sku } : {}),
    ...(item.volume != null ? { volume: item.volume } : {}),
    // OrderItem.metadata is narrowed by v1 to `configurations`, the only
    // key the portal reads (moduleName / moduleCode / shapeType / price).
    metadata: item.configurations ? { configurations: item.configurations } : {},
    cart_item: ci
      ? {
          product_container: product
            ? {
                ...(product.singleProduct
                  ? {
                      single_product: {
                        images: images(product.singleProduct.images),
                        product_profiles: named(product.singleProduct.profiles),
                      },
                    }
                  : {}),
                ...(product.advancedProduct
                  ? {
                      advanced_product: {
                        images: images(product.advancedProduct.images),
                        advanced_product_profiles: named(product.advancedProduct.profiles),
                        dimensions: dimensions(product.advancedProduct.dimensions),
                      },
                    }
                  : {}),
              }
            : undefined,
          ...(ci.advancedProductType != null ? { advanced_product_type: ci.advancedProductType } : {}),
          ...(ci.selectedSofaCombinations != null ? { selected_sofa_combinations: ci.selectedSofaCombinations } : {}),
          ...(ci.fabricCode != null ? { fabric_code: ci.fabricCode } : {}),
          ...(ci.fabricGroupName != null ? { fabric_group_name: ci.fabricGroupName } : {}),
          ...(ci.fabricColorName != null ? { fabric_color_name: ci.fabricColorName } : {}),
          cartItemFabrics: fabricsOf(arr(ci.fabrics)),
          ...(ci.fabricCombination
            ? { fabricCombination: { ...(ci.fabricCombination.id != null ? { id: ci.fabricCombination.id } : {}), ...(combinationImage ? { image: combinationImage } : {}) } }
            : {}),
          additional_components: arr(ci.components).map(component),
        }
      : undefined,
    ...(item.shippingMethod
      ? { shipping_method: { id: item.shippingMethod.id, shipping_method_profiles: titled(item.shippingMethod.profiles) } }
      : {}),
  }
}

export function mapV1OrderDetail(o: V1OrderDetail): OrderDetail {
  return {
    ...orderBase(o),
    preferred_delivery_date: opt(o.preferredDeliveryDate),
    shipping_address: address(o.shippingAddress),
    billing_address: address(o.billingAddress),
    payment_method: o.paymentMethod
      ? { id: o.paymentMethod.id, payment_method_profiles: titled(o.paymentMethod.profiles) }
      : undefined,
    order_items_detail: arr(o.items).map(detailItem),
  }
}

// ---- GET /me/palettes -> FabricPaletteDetail[] ----

/** Already in the backend's priority order: do NOT re-sort / re-merge. */
export function mapV1Palettes(body: { data: N<V1Palette[]> }): FabricPaletteDetail[] {
  return arr(body.data).map((p) => ({
    id: p.id,
    name: p.name,
    ...(p.code != null ? { code: p.code } : {}),
    fabric_groups: arr(p.fabricGroups).map((g) => ({
      id: g.id,
      ...(g.name != null ? { name: g.name } : {}),
      color_codes: g.colorCodes ?? null,
      // Raw [{ code, name?, category? }], as parseColorOverrides expects.
      color_overrides: g.colorOverrides ?? null,
      fabric_group: {
        id: g.fabricGroup.id,
        ...(g.fabricGroup.code != null ? { code: g.fabricGroup.code } : {}),
        createdAt: g.fabricGroup.createdAt ?? null,
        fabrics: arr(g.fabricGroup.fabrics).map((f) => ({
          id: f.id,
          code: f.code,
          createdAt: f.createdAt ?? null,
          ...(f.colorName != null ? { color_name: f.colorName } : {}),
          order: f.order ?? 0,
          image: f.image
            ? {
                id: f.image.id,
                src: f.image.src,
                ...(f.image.srcThumbnail != null ? { src_thumbnail: f.image.srcThumbnail } : {}),
                ...(f.image.srcMd != null ? { src_md: f.image.srcMd } : {}),
              }
            : // GraphQL served a null image as null too.
              (null as unknown as FabricImage),
        })),
        fabric_group_profiles: arr(g.fabricGroup.profiles).map((pr) => ({
          id: pr.id,
          name: pr.name,
          language: pr.language,
          ...(pr.description != null ? { description: pr.description } : {}),
        })),
        fabric_features: arr(g.fabricGroup.features).map((ft) => ({
          fabric_feature: {
            id: ft.id,
            ...(ft.code != null ? { code: ft.code } : {}),
            ...(ft.photo ? { photo: { id: ft.photo.id, src: ft.photo.src } } : {}),
            fabric_feature_profiles: named(ft.profiles),
            fabric_feature_group: ft.group
              ? {
                  id: ft.group.id,
                  ...(ft.group.code != null ? { code: ft.group.code } : {}),
                  fabric_feature_group_profiles: named(ft.group.profiles),
                }
              : null,
          },
        })),
        fabric_price_category: arr(g.fabricGroup.priceCategories).map((pc) => ({
          id: pc.id,
          group_number: pc.groupNumber,
        })),
        manufacturer: g.fabricGroup.manufacturer
          ? {
              id: g.fabricGroup.manufacturer.id,
              fabric_price_category: arr(g.fabricGroup.manufacturer.priceCategories).map((pc) => ({
                group_number: pc.groupNumber,
              })),
            }
          : null,
      },
    })),
  }))
}

// ---- GET /auth/session ----

export const SHOW_ALL_PRODUCTS_PERMISSION = "catalog.show_all_products"

export function sessionHasPermission(session: N<V1AuthSession>, permission: string): boolean {
  return Boolean(session && Array.isArray(session.permissions) && session.permissions.indexOf(permission) !== -1)
}

/** An impersonation session (staff acting as this customer through the admin). */
export function isV1ImpersonationSession(session: N<V1AuthSession>): boolean {
  if (!session) return false
  return session.principal?.impersonatedBy != null || session.session?.kind === "impersonation"
}

// ---- request validation (local 404 before any backend call) ----

/** The v1 order id parameter (cuid): `^[A-Za-z0-9_-]{1,64}$`. */
const ORDER_ID = /^[A-Za-z0-9_-]{1,64}$/

export function isV1OrderId(value: unknown): value is string {
  return typeof value === "string" && ORDER_ID.test(value)
}

/** The v1 CustomerFile id parameter: an integer 1..2147483647, else null. */
export function parseV1FileId(value: unknown): number | null {
  if (typeof value !== "string" || !/^[1-9][0-9]{0,9}$/.test(value)) return null
  const n = Number(value)
  return n >= 1 && n <= 2147483647 ? n : null
}

/** take/skip (GraphQL) -> page/pageSize (v1, pageSize 1..50). */
export function v1PageFromOffset(limit: number, offset: number): { page: number; pageSize: number } {
  const size = Number.isFinite(limit) ? Math.floor(limit) : 20
  const pageSize = Math.min(50, Math.max(1, size))
  const skip = Number.isFinite(offset) && offset > 0 ? Math.floor(offset) : 0
  return { page: Math.floor(skip / pageSize) + 1, pageSize }
}
