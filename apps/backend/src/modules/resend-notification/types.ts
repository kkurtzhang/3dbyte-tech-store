export type ResendNotificationOptions = {
  apiKey: string;
  apiUrl?: string;
  channels?: string[];
  from: string;
};

export type ResendProviderConfig = {
  id: "resend";
  options: ResendNotificationOptions;
  resolve: "./src/modules/resend-notification";
};
