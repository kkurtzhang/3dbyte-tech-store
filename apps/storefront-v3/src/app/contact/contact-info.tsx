import { MapPin, Phone, Mail, Clock } from "lucide-react";

const contactDetails = [
  {
    icon: MapPin,
    label: "Address",
    value: "123 Innovation Drive",
    subValue: "Tech Hub, Hobart TAS 7000",
    subValue2: "Australia",
  },
  {
    icon: Phone,
    label: "Phone",
    value: "+61 3 6123 4567",
    subValue: "Mon - Fri, 9am - 5pm AEST",
  },
  {
    icon: Mail,
    label: "Email",
    value: "hello@3dbytetech.com.au",
    subValue: "We reply within 24 hours",
  },
  {
    icon: Clock,
    label: "Business Hours",
    value: "Monday - Friday: 9am - 5pm",
    subValue: "Saturday: 10am - 2pm",
    subValue2: "Sunday: Closed",
  },
];

export function ContactInfo() {
  return (
    <div className="rounded-lg border bg-card p-6">
      <h2 className="text-xl font-semibold mb-6">Get in Touch</h2>
      <div className="space-y-6">
        {contactDetails.map((detail, index) => (
          <div key={index} className="flex gap-4">
            <div className="flex-shrink-0">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <detail.icon className="h-5 w-5 text-primary" />
              </div>
            </div>
            <div>
              <p className="font-medium">{detail.label}</p>
              <p className="text-sm text-muted-foreground">{detail.value}</p>
              {detail.subValue && (
                <p className="text-sm text-muted-foreground">{detail.subValue}</p>
              )}
              {detail.subValue2 && (
                <p className="text-sm text-muted-foreground">{detail.subValue2}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
