import { GraphQLClient } from "./client"
import { ClientConfig } from "./client/types"
import { CustomerModule } from "./modules/customer"
import { CartModule } from "./modules/cart"
import { ProductPhotosModule } from "./modules/product-photos"
import { ProductCataloguesModule } from "./modules/product-catalogues"
import { ShopSettingsModule } from "./modules/shop-settings"
import { PagesModule } from "./modules/pages"
import { CategoriesModule } from "./modules/categories"
import { CollectionsModule } from "./modules/collections"
import { ProductsModule } from "./modules/products"
import { FiltersModule } from "./modules/filters"
import { MaterialAvailabilityModule } from "./modules/material-availability"
import { OfferPdfModule } from "./modules/offer-pdf"

export class FurnisystemsSDK {
  private client: GraphQLClient
  private config: ClientConfig

  // Module instances
  public customer: CustomerModule
  public cart: CartModule
  public productPhotos: ProductPhotosModule
  public productCatalogues: ProductCataloguesModule
  public shopSettings: ShopSettingsModule
  public pages: PagesModule
  public categories: CategoriesModule
  public collections: CollectionsModule
  public products: ProductsModule
  public filters: FiltersModule
  public materialAvailability: MaterialAvailabilityModule
  public offerPdf: OfferPdfModule

  constructor(config: ClientConfig) {
    this.config = config
    this.client = new GraphQLClient(config)

    // Initialize modules
    this.customer = new CustomerModule(this.client)
    this.cart = new CartModule(this.client)
    this.productPhotos = new ProductPhotosModule(this.config.restApiEndpoint!)
    this.productCatalogues = new ProductCataloguesModule(this.config.restApiEndpoint!)
    this.shopSettings = new ShopSettingsModule(this.client)
    this.pages = new PagesModule(this.client)
    this.categories = new CategoriesModule(this.client)
    this.collections = new CollectionsModule(this.client)
    this.products = new ProductsModule(this.client)
    this.filters = new FiltersModule(this.client)
    this.materialAvailability = new MaterialAvailabilityModule(
      this.config.axApiBaseUrl ?? "https://furnisys.vilmers.com",
      this.config.axApiKey ?? ""
    )
    this.offerPdf = new OfferPdfModule(this.client)
  }

  // Set authentication headers for all requests
  setAuthHeaders(headers: {
    authorization?: string
    "x-publishable-api-key"?: string
  }) {
    this.client.setAuthHeaders(headers)
  }

  // Clear authentication headers
  clearAuthHeaders() {
    this.client.clearAuthHeaders()
  }

  // Get the underlying Apollo Client for advanced usage
  getApolloClient() {
    return this.client.getClient()
  }

  // Clear Apollo cache
  clearCache() {
    this.client.clearCache()
  }

  // Reset Apollo cache
  resetCache() {
    this.client.resetCache()
  }
}

// Export types and errors
export * from "./types/common"
export * from "./client/errors"
export * from "./client/types"
export * from "./modules/customer"
export * from "./modules/cart"
export * from "./modules/product-photos"
export * from "./modules/product-catalogues"
export * from "./modules/shop-settings"
export * from "./modules/pages"
export * from "./modules/categories"
export * from "./modules/collections"
export * from "./modules/products"
export * from "./modules/filters"
export * from "./modules/material-availability"
export * from "./modules/offer-pdf"

// Default export
export default FurnisystemsSDK
