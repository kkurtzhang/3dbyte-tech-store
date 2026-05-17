import { defineRouteConfig } from "@medusajs/admin-sdk";
import {
  Badge,
  Button,
  Container,
  FocusModal,
  Heading,
  Input,
  Label,
  Text,
  toast,
} from "@medusajs/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type React from "react";
import { useMemo, useState } from "react";

import { Header } from "../../../components/header";
import { sdk } from "../../../lib/sdk";

type EmailEnvironment = "development" | "production" | "staging";

type EmailProfileKey = "default" | "order" | "stock";

type EmailSenderProfile = {
  description: string;
  from: string;
  key: EmailProfileKey;
  label: string;
  reply_to: string;
};

type EmailSettingsResponse = {
  allowed_domain: string;
  environment: EmailEnvironment;
  profiles: EmailSenderProfile[];
  resend_configured: boolean;
};

type EditFormState = {
  from: string;
  reply_to: string;
};

type TestFormState = {
  to: string;
};

type BadgeColor = React.ComponentProps<typeof Badge>["color"];

const emailSettingsQueryKey = ["email-settings"];

const emptyEditForm: EditFormState = {
  from: "",
  reply_to: "",
};

const emptyTestForm: TestFormState = {
  to: "",
};

const extractEmailAddress = (value: string): string => {
  const trimmed = value.trim();
  const bracketMatch = trimmed.match(/<([^<>@\s]+@[^<>@\s]+)>$/);

  return (bracketMatch?.[1] || trimmed).toLowerCase();
};

const getValidationState = (
  profile: EmailSenderProfile,
  settings?: EmailSettingsResponse,
) => {
  if (!settings) {
    return {
      color: "grey" as BadgeColor,
      label: "Loading",
    };
  }

  const address = extractEmailAddress(profile.from);
  const [localPart, domain] = address.split("@");

  if (domain !== settings.allowed_domain) {
    return {
      color: "red" as BadgeColor,
      label: "Invalid domain",
    };
  }

  if (settings.environment === "staging" && !localPart.startsWith("staging-")) {
    return {
      color: "red" as BadgeColor,
      label: "Missing staging prefix",
    };
  }

  if (
    settings.environment === "production" &&
    localPart.startsWith("staging-")
  ) {
    return {
      color: "red" as BadgeColor,
      label: "Staging sender in production",
    };
  }

  return {
    color: "green" as BadgeColor,
    label: `Valid for ${settings.environment}`,
  };
};

const sortProfiles = (profiles: EmailSenderProfile[]) => {
  const order: Record<EmailProfileKey, number> = {
    default: 0,
    order: 1,
    stock: 2,
  };

  return [...profiles].sort((left, right) => order[left.key] - order[right.key]);
};

const EmailSettingsPage = () => {
  const queryClient = useQueryClient();
  const [editingProfile, setEditingProfile] =
    useState<EmailSenderProfile | null>(null);
  const [testingProfile, setTestingProfile] =
    useState<EmailSenderProfile | null>(null);
  const [editForm, setEditForm] = useState<EditFormState>(emptyEditForm);
  const [testForm, setTestForm] = useState<TestFormState>(emptyTestForm);

  const { data: settings, isLoading } = useQuery({
    queryKey: emailSettingsQueryKey,
    queryFn: () =>
      sdk.client.fetch<EmailSettingsResponse>("/admin/email-settings"),
  });

  const profiles = useMemo(
    () => sortProfiles(settings?.profiles || []),
    [settings?.profiles],
  );

  const updateProfile = useMutation({
    mutationFn: async ({
      key,
      payload,
    }: {
      key: EmailProfileKey;
      payload: EditFormState;
    }) => {
      return sdk.client.fetch(`/admin/email-settings/profiles/${key}`, {
        method: "put",
        body: payload,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: emailSettingsQueryKey });
      setEditingProfile(null);
      setEditForm(emptyEditForm);
      toast.success("Email sender saved");
    },
    onError: (err) => {
      toast.error("Failed to save email sender", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    },
  });

  const sendTestEmail = useMutation({
    mutationFn: async ({
      key,
      payload,
    }: {
      key: EmailProfileKey;
      payload: TestFormState;
    }) => {
      return sdk.client.fetch(`/admin/email-settings/profiles/${key}/test`, {
        method: "post",
        body: payload,
      });
    },
    onSuccess: () => {
      setTestingProfile(null);
      setTestForm(emptyTestForm);
      toast.success("Test email sent");
    },
    onError: (err) => {
      toast.error("Failed to send test email", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    },
  });

  const openEditModal = (profile: EmailSenderProfile) => {
    setEditingProfile(profile);
    setEditForm({
      from: profile.from,
      reply_to: profile.reply_to,
    });
  };

  const openTestModal = (profile: EmailSenderProfile) => {
    setTestingProfile(profile);
    setTestForm(emptyTestForm);
  };

  const closeEditModal = () => {
    if (!updateProfile.isPending) {
      setEditingProfile(null);
      setEditForm(emptyEditForm);
    }
  };

  const closeTestModal = () => {
    if (!sendTestEmail.isPending) {
      setTestingProfile(null);
      setTestForm(emptyTestForm);
    }
  };

  const handleEditSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!editingProfile) {
      return;
    }

    updateProfile.mutate({
      key: editingProfile.key,
      payload: editForm,
    });
  };

  const handleTestSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!testingProfile) {
      return;
    }

    sendTestEmail.mutate({
      key: testingProfile.key,
      payload: testForm,
    });
  };

  return (
    <Container>
      <Header
        title="Email"
        subtitle="Manage Medusa transactional email senders."
      />
      <div className="flex flex-col gap-y-6 px-6 py-8">
        {!settings?.resend_configured ? (
          <div className="rounded-lg border border-ui-border-base bg-ui-bg-subtle p-4">
            <Heading level="h3" className="text-ui-fg-base">
              Resend is not configured
            </Heading>
            <Text className="mt-2 text-ui-fg-subtle">
              Add the Medusa Resend API key and fallback sender environment
              variables before sending test emails.
            </Text>
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          {isLoading ? (
            <Text className="text-ui-fg-subtle">Loading email senders...</Text>
          ) : null}
          {profiles.map((profile) => {
            const validation = getValidationState(profile, settings);

            return (
              <div
                key={profile.key}
                className="rounded-lg border border-ui-border-base bg-ui-bg-base p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Heading level="h3">{profile.label}</Heading>
                    <Text size="small" className="mt-1 text-ui-fg-subtle">
                      {profile.description}
                    </Text>
                  </div>
                  <Badge color={validation.color}>{validation.label}</Badge>
                </div>

                <div className="mt-5 flex flex-col gap-y-3">
                  <div>
                    <Text size="small" className="text-ui-fg-muted">
                      From
                    </Text>
                    <Text className="break-words">{profile.from}</Text>
                  </div>
                  <div>
                    <Text size="small" className="text-ui-fg-muted">
                      Reply-To
                    </Text>
                    <Text className="break-words">{profile.reply_to}</Text>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    size="small"
                    onClick={() => openEditModal(profile)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="secondary"
                    size="small"
                    disabled={!settings?.resend_configured}
                    onClick={() => openTestModal(profile)}
                  >
                    Send test
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <FocusModal
        open={Boolean(editingProfile)}
        onOpenChange={(open) => {
          if (!open) {
            closeEditModal();
          }
        }}
      >
        <FocusModal.Content>
          <form onSubmit={handleEditSubmit}>
            <FocusModal.Header>
              <Button
                type="submit"
                isLoading={updateProfile.isPending}
                disabled={updateProfile.isPending}
              >
                Save
              </Button>
            </FocusModal.Header>
            <FocusModal.Body>
              <div className="mx-auto flex w-full max-w-[720px] flex-col gap-y-6 p-8">
                <div>
                  <Heading>Edit {editingProfile?.label}</Heading>
                  <Text className="mt-2 text-ui-fg-subtle">
                    Sender addresses must use @{settings?.allowed_domain}.
                  </Text>
                </div>
                <div className="flex flex-col gap-y-2">
                  <Label htmlFor="email-settings-from">From</Label>
                  <Input
                    id="email-settings-from"
                    value={editForm.from}
                    onChange={(event) =>
                      setEditForm((current) => ({
                        ...current,
                        from: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="flex flex-col gap-y-2">
                  <Label htmlFor="email-settings-reply-to">Reply-To</Label>
                  <Input
                    id="email-settings-reply-to"
                    value={editForm.reply_to}
                    onChange={(event) =>
                      setEditForm((current) => ({
                        ...current,
                        reply_to: event.target.value,
                      }))
                    }
                  />
                </div>
              </div>
            </FocusModal.Body>
          </form>
        </FocusModal.Content>
      </FocusModal>

      <FocusModal
        open={Boolean(testingProfile)}
        onOpenChange={(open) => {
          if (!open) {
            closeTestModal();
          }
        }}
      >
        <FocusModal.Content>
          <form onSubmit={handleTestSubmit}>
            <FocusModal.Header>
              <Button
                type="submit"
                isLoading={sendTestEmail.isPending}
                disabled={sendTestEmail.isPending || !testForm.to}
              >
                Send
              </Button>
            </FocusModal.Header>
            <FocusModal.Body>
              <div className="mx-auto flex w-full max-w-[560px] flex-col gap-y-6 p-8">
                <div>
                  <Heading>Send test from {testingProfile?.label}</Heading>
                  <Text className="mt-2 text-ui-fg-subtle">
                    This sends through the selected sender profile.
                  </Text>
                </div>
                <div className="flex flex-col gap-y-2">
                  <Label htmlFor="email-settings-test-to">Recipient</Label>
                  <Input
                    id="email-settings-test-to"
                    type="email"
                    value={testForm.to}
                    onChange={(event) =>
                      setTestForm({ to: event.target.value })
                    }
                  />
                </div>
              </div>
            </FocusModal.Body>
          </form>
        </FocusModal.Content>
      </FocusModal>
    </Container>
  );
};

export const config = defineRouteConfig({
  label: "Email",
});

export default EmailSettingsPage;
