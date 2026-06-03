import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from "@react-email/components";

import { EMAIL_BRAND_LOGO_ALT, getEmailBrandLogoUrl } from "../brand-assets";

type Props = {
  manageUrl: string;
  productTitle: string;
  productUrl: string;
  storeName: string;
  variantTitle?: string | null;
};

export default function WaitlistBackInStockEmail({
  manageUrl,
  productTitle,
  productUrl,
  storeName,
  variantTitle,
}: Props) {
  const productLabel = `${productTitle}${variantTitle ? ` (${variantTitle})` : ""}`;

  return (
    <Html>
      <Head />
      <Preview>{productLabel} is back in stock</Preview>
      <Body
        style={{ backgroundColor: "#f6f6f6", fontFamily: "Arial, sans-serif" }}
      >
        <Container
          style={{
            backgroundColor: "#ffffff",
            margin: "0 auto",
            maxWidth: "560px",
            padding: "32px",
          }}
        >
          <Img
            alt={EMAIL_BRAND_LOGO_ALT}
            height="50"
            src={getEmailBrandLogoUrl()}
            style={{
              display: "block",
              height: "auto",
              margin: "0 0 24px",
              maxWidth: "180px",
              width: "180px",
            }}
            width="180"
          />
          <Heading as="h1">Back in stock</Heading>
          <Text>Good news - it is available again.</Text>
          <Text>
            {productLabel} is available again at {storeName}. If it suits your
            build, now is a good time to grab it.
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
          <Text>
            Need to stop this alert?{" "}
            <a href={manageUrl} style={{ color: "#111827", fontWeight: 700 }}>
              Manage this alert
            </a>
            .
          </Text>
          <Hr />
          <Text style={{ color: "#6b7280", fontSize: "12px" }}>
            You are receiving this because you joined the waitlist for this
            item. You can manage or unsubscribe from this notification here:{" "}
            {manageUrl}
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
