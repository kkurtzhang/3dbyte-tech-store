export type MaildevNotificationOptions = {
  auth?: {
    pass: string;
    user: string;
  };
  channels: string[];
  from: string;
  host: string;
  port: number;
  rejectUnauthorized: boolean;
  secure: boolean;
  webUrl?: string;
};

export type MaildevProviderConfig = {
  id: "maildev";
  options: MaildevNotificationOptions;
  resolve: "./src/modules/maildev-notification";
};
