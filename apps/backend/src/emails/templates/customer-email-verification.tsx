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

type CustomerEmailVerificationEmailProps = {
  customerEmail: string;
  storeName: string;
  verificationUrl: string;
};

export default function CustomerEmailVerificationEmail({
  customerEmail,
  storeName,
  verificationUrl,
}: CustomerEmailVerificationEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Confirm your {storeName} account email.</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Img
            alt={EMAIL_BRAND_LOGO_ALT}
            height="50"
            src={getEmailBrandLogoUrl()}
            style={brandLogoStyle}
            width="180"
          />

          <Text style={eyebrowStyle}>Account confirmation</Text>
          <Heading style={headingStyle}>Confirm your email address.</Heading>

          <Text style={textStyle}>Hi there,</Text>
          <Text style={textStyle}>
            Please confirm that {customerEmail} is the email address for your{" "}
            {storeName} account.
          </Text>

          <Section style={buttonSectionStyle}>
            <a href={verificationUrl} style={buttonStyle}>
              Confirm email
            </a>
          </Section>

          <Text style={mutedTextStyle}>
            This link expires soon. If you did not create this account, you can
            ignore this email.
          </Text>

          <Hr style={dividerStyle} />

          <Text style={footerStyle}>
            Having trouble? Paste this link into your browser:{" "}
            <a href={verificationUrl} style={linkStyle}>
              {verificationUrl}
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
