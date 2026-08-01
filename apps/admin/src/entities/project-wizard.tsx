import {
  type CreateProjectBody,
  type CreateTaskBody,
  useCreateProject,
  useCreateTask,
  useInviteProjectMembers,
} from "@repo/api-react";
import { Textarea, useToast } from "@repo/design-system";
import { WizardStepError } from "@repo/forms";
import {
  deriveFields,
  emptyValues,
  FormFields,
  Wizard,
  type WizardStepConfig,
} from "@repo/forms-ui";
import { projectEntity } from "@repo/schemas";
import { useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { Page } from "../ui";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseEmails(text: string): string[] {
  return text
    .split(/[\s,;]+/)
    .map((s) => s.trim())
    .filter((s) => EMAIL_RE.test(s));
}

function parseLines(text: string): string[] {
  return text
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

function LabeledTextarea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <Textarea value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

/**
 * The reference wizard: proof that the form engine is separate from CRUD AND that the structure is
 * reusable. All the mechanics (stepper, buttons, state, validation gating) live in `<Wizard>`
 * (`@repo/forms-ui`) — here we inject only the steps (`render`) and `onComplete`, which orchestrates
 * THREE different handlers: the project → the database (create), invitations → the mailer (nothing
 * persisted), tasks → bulk create.
 */
export function CreateProjectWizard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const createProject = useCreateProject();
  const invite = useInviteProjectMembers();
  const createTask = useCreateTask();

  const projectFields = deriveFields(projectEntity);

  const steps: WizardStepConfig<Record<string, unknown>>[] = [
    {
      id: "project",
      label: "Dane projektu",
      schema: projectEntity.validation, // full validation, cross-field rules included
      render: (wizard) => <FormFields fields={projectFields} form={wizard} />,
    },
    {
      id: "invite",
      label: "Zaproszenia",
      schema: z.object({ inviteEmailsText: z.string().optional() }),
      render: (wizard) => (
        <LabeledTextarea
          label="E-maile do zaproszenia (po przecinku lub w liniach) — trafiają do mailera, nie do bazy"
          value={(wizard.values.inviteEmailsText as string) ?? ""}
          onChange={(v) => wizard.setValue("inviteEmailsText", v)}
        />
      ),
    },
    {
      id: "tasks",
      label: "Zadania",
      schema: z.object({ taskTitlesText: z.string().optional() }),
      render: (wizard) => (
        <LabeledTextarea
          label="Początkowe zadania (jedno na linię) — tworzone hurtem"
          value={(wizard.values.taskTitlesText as string) ?? ""}
          onChange={(v) => wizard.setValue("taskTitlesText", v)}
        />
      ),
    },
  ];

  return (
    <Page title="Utwórz projekt (kreator)">
      <div className="max-w-lg">
        <Wizard<Record<string, unknown>>
          steps={steps}
          defaultValues={{
            ...emptyValues(projectEntity),
            inviteEmailsText: "",
            taskTitlesText: "",
          }}
          labels={{ next: "Dalej", submit: "Utwórz" }}
          // No `try/catch` of our own: `<Wizard>` handles the final orchestration error — it shows
          // the `detail` from the API and returns to the step named by `WizardStepError`.
          // `WizardStepError.from` keeps the original error, so the fields from problem+json are
          // highlighted in that step's form.
          onComplete={async (values) => {
            // 1) the project → the database
            const project = await createProject
              .mutateAsync(values as unknown as CreateProjectBody)
              .catch((error: unknown) => {
                throw WizardStepError.from("project", error);
              });
            // 2) invitations → the mailer (NOT the database)
            const emails = parseEmails((values.inviteEmailsText as string) ?? "");
            if (emails.length > 0) {
              await invite.mutateAsync({ id: project.id, emails }).catch((error: unknown) => {
                throw WizardStepError.from("invite", error);
              });
            }
            // 3) the initial tasks → bulk create (the database)
            for (const title of parseLines((values.taskTitlesText as string) ?? "")) {
              await createTask
                .mutateAsync({
                  projectId: project.id,
                  title,
                  status: "todo",
                  priority: "medium",
                  isBlocked: false,
                } as CreateTaskBody)
                .catch((error: unknown) => {
                  throw WizardStepError.from("tasks", error);
                });
            }
            toast("Utworzono projekt wraz z zaproszeniami i zadaniami.", "success");
            navigate({ to: "/projects/$id", params: { id: project.id } });
          }}
        />
      </div>
    </Page>
  );
}
