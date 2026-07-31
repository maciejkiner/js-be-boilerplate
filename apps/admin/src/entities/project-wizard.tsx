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
 * Wizard referencyjny: dowód separacji silnika formularzy od CRUD ORAZ reużywalnej struktury.
 * Cała mechanika (Stepper, przyciski, stan, walidacja-gating) jest w `<Wizard>` (`@repo/forms-ui`) —
 * tu wstrzykujemy tylko kroki (`render`) i `onComplete`, który orkiestruje TRZY różne handlery:
 * projekt → baza (create), zaproszenia → mailer (bez zapisu), zadania → hurt (create).
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
      schema: projectEntity.validation, // walidacja pełna, w tym międzypolowa
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
          // Bez własnego `try/catch`: błąd finalnej orkiestracji obsługuje `<Wizard>` — pokazuje
          // `detail` z API i cofa do kroku wskazanego przez `WizardStepError`. `WizardStepError.from`
          // zachowuje błąd źródłowy, więc pola z problem+json podświetlają się w formularzu kroku.
          onComplete={async (values) => {
            // 1) projekt → baza
            const project = await createProject
              .mutateAsync(values as unknown as CreateProjectBody)
              .catch((error: unknown) => {
                throw WizardStepError.from("project", error);
              });
            // 2) zaproszenia → mailer (NIE do bazy)
            const emails = parseEmails((values.inviteEmailsText as string) ?? "");
            if (emails.length > 0) {
              await invite.mutateAsync({ id: project.id, emails }).catch((error: unknown) => {
                throw WizardStepError.from("invite", error);
              });
            }
            // 3) początkowe zadania → hurt (baza)
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
