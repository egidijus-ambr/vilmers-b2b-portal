import { gql } from "@apollo/client"
import { ApolloGraphQLClient } from "../../client"
import {
  CartOfferData,
  EmailCartOfferOptions,
  GetCartOfferDataOptions,
  OfferPdfResult,
  RenderOfferPdfOptions,
} from "./types"

const RENDER_CART_OFFER_PDF = gql`
  mutation RenderCartOfferPdf(
    $cartId: Int!
    $language: Language!
    $showPvm: Boolean
    $showVolume: Boolean
    $vatRate: Float
    $persist: Boolean
    $overrides: [OfferItemOverrideInput]
  ) {
    renderCartOfferPdf(
      cartId: $cartId
      language: $language
      showPvm: $showPvm
      showVolume: $showVolume
      vatRate: $vatRate
      persist: $persist
      overrides: $overrides
    ) {
      base64
      url
      fileName
    }
  }
`

const GET_CART_OFFER_DATA = gql`
  query GetCartOfferData(
    $cartId: Int!
    $language: Language!
    $showPvm: Boolean
    $showVolume: Boolean
    $vatRate: Float
  ) {
    getCartOfferData(
      cartId: $cartId
      language: $language
      showPvm: $showPvm
      showVolume: $showVolume
      vatRate: $vatRate
    ) {
      context {
        language
        showPvm
        showVolume
        vatRate
        logoUrl
      }
      items {
        cartItemId
        reference
        name
        imageUrl
        moduleCombination
        widthCm
        depthCm
        heightCm
        quantity
        volumeM3
        totalNet
        manufacturer
        bottoms
        market
        rawSofaCombinations
        fabricSpecs {
          collection
          code
          colorName
          type
          imageUrl
        }
        componentSpecs {
          groupCode
          groupName
          code
          name
          imageUrl
          colorHex
          widthCm
          depthCm
          heightCm
        }
      }
    }
  }
`

const EMAIL_CART_OFFER = gql`
  mutation EmailCartOffer(
    $cartId: Int!
    $pdfBase64: String!
    $fileName: String
    $recipientEmail: String
  ) {
    emailCartOffer(
      cartId: $cartId
      pdfBase64: $pdfBase64
      fileName: $fileName
      recipientEmail: $recipientEmail
    )
  }
`

export class OfferPdfModule {
  constructor(private client: ApolloGraphQLClient) {}

  async render(
    cartId: number,
    opts: RenderOfferPdfOptions
  ): Promise<OfferPdfResult> {
    const data = await this.client.mutate<{
      renderCartOfferPdf: OfferPdfResult
    }>(RENDER_CART_OFFER_PDF, {
      variables: { cartId, ...opts },
    })
    return data.renderCartOfferPdf
  }

  async getCartOfferData(
    cartId: number,
    opts: GetCartOfferDataOptions
  ): Promise<CartOfferData | null> {
    const data = await this.client.query<{
      getCartOfferData: CartOfferData | null
    }>(GET_CART_OFFER_DATA, {
      variables: { cartId, ...opts },
      // Always reflect DB truth for the cart's current contents/pricing.
      fetchPolicy: "no-cache",
    })
    return data.getCartOfferData
  }

  async emailCartOffer(
    cartId: number,
    pdfBase64: string,
    opts?: EmailCartOfferOptions
  ): Promise<boolean> {
    const data = await this.client.mutate<{
      emailCartOffer: boolean
    }>(EMAIL_CART_OFFER, {
      variables: {
        cartId,
        pdfBase64,
        fileName: opts?.fileName ?? null,
        recipientEmail: opts?.recipientEmail ?? null,
      },
    })
    return data.emailCartOffer
  }
}

export * from "./types"
