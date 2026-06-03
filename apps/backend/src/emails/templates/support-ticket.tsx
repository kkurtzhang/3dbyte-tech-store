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

type Detail = {
  label: string;
  value?: string | null;
};

type Props = {
  bodyLines: string[];
  details: Detail[];
  footerText: string;
  heading: string;
  highlightTitle?: string;
  highlightLines?: string[];
  preheader: string;
  supportInboxEmail: string;
  title: string;
};

export default function SupportTicketEmail({
  bodyLines,
  details,
  footerText,
  heading,
  highlightLines = [],
  highlightTitle,
  preheader,
  supportInboxEmail,
  title,
}: Props) {
  const visibleDetails = details.filter((detail) => detail.value);

  return (
    <Html>
      <Head />
      <Preview>{preheader}</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Img
            alt={EMAIL_BRAND_LOGO_ALT}
            height="50"
            src={getEmailBrandLogoUrl()}
            style={brandLogoStyle}
            width="180"
          />

          <Text style={eyebrowStyle}>{heading}</Text>
          <Heading style={headingStyle}>{title}</Heading>

          {bodyLines.map((line) => (
            <Text key={line} style={textStyle}>
              {line}
            </Text>
          ))}

          {visibleDetails.length > 0 ? (
            <Section style={panelStyle}>
              <Heading as="h2" style={sectionHeadingStyle}>
                Ticket details
              </Heading>
              {visibleDetails.map((detail) => (
                <Text key={detail.label} style={detailTextStyle}>
                  <strong>{detail.label}:</strong> {detail.value}
                </Text>
              ))}
            </Section>
          ) : null}

          {highlightTitle && highlightLines.length > 0 ? (
            <Section style={panelStyle}>
              <Heading as="h2" style={sectionHeadingStyle}>
                {highlightTitle}
              </Heading>
              {highlightLines.map((line) => (
                <Text key={line} style={detailTextStyle}>
                  {line}
                </Text>
              ))}
            </Section>
          ) : null}

          <Hr style={dividerStyle} />

          <Text style={footerStyle}>
            {footerText} You can reach us at{" "}
            <a href={`mailto:${supportInboxEmail}`} style={linkStyle}>
              {supportInboxEmail}
            </a>
            .
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

const panelStyle = {
  backgroundColor: "#f8fafc",
  border: "1px solid #e5e7eb",
  borderRadius: "6px",
  margin: "20px 0 0",
  padding: "16px",
};

const sectionHeadingStyle = {
  color: "#111827",
  fontSize: "16px",
  lineHeight: "22px",
  margin: "0 0 10px",
};

const detailTextStyle = {
  color: "#374151",
  fontSize: "14px",
  lineHeight: "21px",
  margin: "0 0 8px",
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
