import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components"

type Props = {
  manageUrl: string
  productTitle: string
  productUrl: string
  storeName: string
  variantTitle?: string | null
}

export default function WaitlistBackInStockEmail({
  manageUrl,
  productTitle,
  productUrl,
  storeName,
  variantTitle,
}: Props) {
  const productLabel = `${productTitle}${variantTitle ? ` (${variantTitle})` : ""}`

  return (
    <Html>
      <Head />
      <Preview>{productLabel} is back in stock</Preview>
      <Body style={{ backgroundColor: "#f6f6f6", fontFamily: "Arial, sans-serif" }}>
        <Container
          style={{
            backgroundColor: "#ffffff",
            margin: "0 auto",
            maxWidth: "560px",
            padding: "32px",
          }}
        >
          <Heading as="h1">Back in stock</Heading>
          <Text>
            Good news. {productLabel} is available again at {storeName}.
          </Text>
          <Section style={{ margin: "28px 0" }}>
            <Button
              href={productUrl}
              style={{
                backgroundColor: "#111827",
                color: "#ffffff",
                padding: "12px 18px",
                textDecoration: "none",
              }}
            >
              View product
            </Button>
          </Section>
          <Hr />
          <Text style={{ color: "#6b7280", fontSize: "12px" }}>
            You are receiving this because you joined the waitlist for this item.
            You can manage or unsubscribe from this notification here: {manageUrl}
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
