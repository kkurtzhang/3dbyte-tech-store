import {
  Body,
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

type CustomerPasswordResetEmailProps = {
  customerEmail: string;
  resetPasswordUrl: string;
  storeName: string;
};

export default function CustomerPasswordResetEmail({
  customerEmail,
  resetPasswordUrl,
  storeName,
}: CustomerPasswordResetEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Reset your {storeName} account password.</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Img
            alt={EMAIL_BRAND_LOGO_ALT}
            height="50"
            src={getEmailBrandLogoUrl()}
            style={brandLogoStyle}
            width="180"
          />

          <Text style={eyebrowStyle}>Password reset</Text>
          <Heading style={headingStyle}>Reset your password.</Heading>

          <Text style={textStyle}>Hi there,</Text>
          <Text style={textStyle}>
            We received a request to reset the password for {customerEmail}.
          </Text>

          <Section style={buttonSectionStyle}>
            <a href={resetPasswordUrl} style={buttonStyle}>
              Reset password
            </a>
          </Section>

          <Text style={mutedTextStyle}>
            If you did not request this reset, you can ignore this email.
          </Text>

          <Hr style={dividerStyle} />

          <Text style={footerStyle}>
            Having trouble? Paste this link into your browser:{" "}
            <a href={resetPasswordUrl} style={linkStyle}>
              {resetPasswordUrl}
            </a>
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const bodyStyle = {
  backgroundColor: "#f6f6f6",
  color: "#111827",
  fontFamily: "Arial, sans-serif",
};

const containerStyle = {
  backgroundColor: "#ffffff",
  border: "1px solid #e5e7eb",
  margin: "24px auto",
  maxWidth: "640px",
  padding: "32px",
};

const brandLogoStyle = {
  display: "block",
  height: "auto",
  margin: "0 0 24px",
  maxWidth: "180px",
  width: "180px",
};

const eyebrowStyle = {
  color: "#6b7280",
  fontSize: "13px",
  letterSpacing: "0",
  lineHeight: "18px",
  margin: "0 0 8px",
};

const headingStyle = {
  color: "#111827",
  fontSize: "24px",
  lineHeight: "31px",
  margin: "0 0 18px",
};

const textStyle = {
  color: "#374151",
  fontSize: "15px",
  lineHeight: "24px",
  margin: "0 0 12px",
};

const mutedTextStyle = {
  ...textStyle,
  color: "#6b7280",
};

const buttonSectionStyle = {
  margin: "24px 0",
};

const buttonStyle = {
  backgroundColor: "#0f172a",
  borderRadius: "6px",
  color: "#ffffff",
  display: "inline-block",
  fontSize: "14px",
  fontWeight: "700",
  padding: "12px 18px",
  textDecoration: "none",
};

const dividerStyle = {
  borderColor: "#e5e7eb",
  margin: "24px 0 16px",
};

const footerStyle = {
  color: "#6b7280",
  fontSize: "12px",
  lineHeight: "18px",
  margin: "0",
};

const linkStyle = {
  color: "#0f172a",
  fontWeight: "700",
};
