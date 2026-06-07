import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

export function GuestHistoryConsolidatedEmail({
  customerEmail,
  transferredOrderCount,
}: {
  customerEmail: string;
  transferredOrderCount: number;
}) {
  const orderLabel =
    transferredOrderCount === 1
      ? "1 previous order"
      : `${transferredOrderCount} previous orders`;

  return (
    <Html>
      <Head />
      <Preview>Your 3D Byte Tech account is ready</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Section style={styles.header}>
            <Text style={styles.brand}>3D BYTE TECH</Text>
          </Section>
          <Section style={styles.content}>
            <Heading style={styles.heading}>Account ready</Heading>
            <Text style={styles.text}>
              Your verified account for {customerEmail} is ready.
            </Text>
            <Text style={styles.text}>
              We connected {orderLabel} from guest checkout so you can find them
              in your account history.
            </Text>
            <Text style={styles.muted}>
              We did not copy checkout addresses into your saved addresses.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const styles = {
  body: {
    backgroundColor: "#f5f7f8",
    color: "#172126",
    fontFamily: "Arial, sans-serif",
    margin: 0,
    padding: "32px 12px",
  },
  container: {
    backgroundColor: "#ffffff",
    border: "1px solid #dce3e6",
    borderRadius: "8px",
    margin: "0 auto",
    maxWidth: "560px",
    overflow: "hidden",
  },
  header: {
    backgroundColor: "#172126",
    padding: "20px 28px",
  },
  brand: {
    color: "#ffffff",
    fontSize: "15px",
    fontWeight: "700",
    margin: 0,
  },
  content: {
    padding: "28px",
  },
  heading: {
    fontSize: "24px",
    lineHeight: "32px",
    margin: "0 0 16px",
  },
  text: {
    fontSize: "15px",
    lineHeight: "24px",
    margin: "0 0 14px",
  },
  muted: {
    color: "#586970",
    fontSize: "13px",
    lineHeight: "20px",
    margin: "20px 0 0",
  },
} as const;
