import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Preview,
  Text,
} from "@react-email/components";

import { EMAIL_BRAND_LOGO_ALT, getEmailBrandLogoUrl } from "../brand-assets";

export function AccountSecurityEmail({
  message,
  subject,
}: {
  message: string;
  subject: string;
}) {
  return (
    <Html>
      <Head />
      <Preview>{subject}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Img
            alt={EMAIL_BRAND_LOGO_ALT}
            height="50"
            src={getEmailBrandLogoUrl()}
            style={styles.logo}
            width="180"
          />
          <Text style={styles.eyebrow}>Account security</Text>
          <Heading style={styles.heading}>{subject}</Heading>
          <Text style={styles.text}>{message}</Text>
          <Hr style={styles.divider} />
          <Text style={styles.warning}>
            If this was not you, contact 3D Byte Tech support.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const styles = {
  body: {
    backgroundColor: "#f6f6f6",
    color: "#111827",
    fontFamily: "Arial, sans-serif",
  },
  container: {
    backgroundColor: "#ffffff",
    border: "1px solid #e5e7eb",
    margin: "24px auto",
    maxWidth: "640px",
    padding: "32px",
  },
  logo: {
    display: "block",
    height: "auto",
    margin: "0 0 24px",
    maxWidth: "180px",
    width: "180px",
  },
  eyebrow: {
    color: "#6b7280",
    fontSize: "13px",
    letterSpacing: "0",
    lineHeight: "18px",
    margin: "0 0 8px",
  },
  heading: {
    color: "#111827",
    fontSize: "24px",
    lineHeight: "31px",
    margin: "0 0 18px",
  },
  text: {
    color: "#374151",
    fontSize: "15px",
    lineHeight: "24px",
    margin: "0",
  },
  divider: {
    borderColor: "#e5e7eb",
    margin: "24px 0 16px",
  },
  warning: {
    color: "#6b7280",
    fontSize: "13px",
    lineHeight: "20px",
    margin: "0",
  },
} as const;
