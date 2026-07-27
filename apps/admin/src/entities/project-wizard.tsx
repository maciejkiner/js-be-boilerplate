import {
  type CreateProjectBody,
  type CreateTaskBody,
  useCreateProject,
  useCreateTask,
  useInviteProjectMembers,
} from "@repo/api-react";
import { Button, Stepper, Textarea, useToast } from "@repo/design-system";
import { useWizard } from "@repo/forms";
import { deriveFields, emptyValues, FormFields } from "@repo/forms-ui";
import { projectEntity } from "@repo/schemas";
import { useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { z } from "zod";
import { Page } from "../ui";

// Kroki: dane projektu (walidacja pełna, w tym międzypolowa) → zaproszenia → zadania.
const STEPS = [
  { id: "project", label: "Dane projektu", schema: projectEntity.validation },
  {
    id: "invite",
    label: "Zaproszenia",
    schema: z.object({ inviteEmailsText: z.string().optional() }),
  },
  { id: "tasks", label: "Zadania", schema: z.object({ taskTitlesText: z.string().optional() }) },
];

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
 * Wizard referencyjny: dowód separacji silnika formularzy od CRUD. `onComplete` orkiestruje
 * TRZY różne handlery: projekt → baza (create), zaproszenia → mailer (bez zapisu), zadania → hurt (create).
 */
export function CreateProjectWizard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const createProject = useCreateProject();
  const invite = useInviteProjectMembers();
  const createTask = useCreateTask();

  const projectFields = deriveFields(projectEntity);

  const wizard = useWizard<Record<string, unknown>>({
    steps: STEPS,
    defaultValues: { ...emptyValues(projectEntity), inviteEmailsText: "", taskTitlesText: "" },
    onComplete: async (values) => {
      try {
        // 1) projekt → baza
        const project = await createProject.mutateAsync(values as unknown as CreateProjectBody);
        // 2) zaproszenia → mailer (NIE do bazy)
        const emails = parseEmails((values.inviteEmailsText as string) ?? "");
        if (emails.length > 0) {
          await invite.mutateAsync({ id: project.id, emails });
        }
        // 3) początkowe zadania → hurt (baza)
        for (const title of parseLines((values.taskTitlesText as string) ?? "")) {
          await createTask.mutateAsync({
            projectId: project.id,
            title,
            status: "todo",
            priority: "medium",
            isBlocked: false,
          } as CreateTaskBody);
        }
        toast("Utworzono projekt wraz z zaproszeniami i zadaniami.", "success");
        navigate({ to: "/projects/$id", params: { id: project.id } });
      } catch {
        toast("Nie udało się ukończyć kreatora.", "error");
      }
    },
  });

  let stepBody: ReactNode = null;
  if (wizard.stepIndex === 0) {
    stepBody = <FormFields fields={projectFields} form={wizard} />;
  } else if (wizard.stepIndex === 1) {
    stepBody = (
      <LabeledTextarea
        label="E-maile do zaproszenia (po przecinku lub w liniach) — trafiają do mailera, nie do bazy"
        value={(wizard.values.inviteEmailsText as string) ?? ""}
        onChange={(v) => wizard.setValue("inviteEmailsText", v)}
      />
    );
  } else {
    stepBody = (
      <LabeledTextarea
        label="Początkowe zadania (jedno na linię) — tworzone hurtem"
        value={(wizard.values.taskTitlesText as string) ?? ""}
        onChange={(v) => wizard.setValue("taskTitlesText", v)}
      />
    );
  }

  return (
    <Page title="Utwórz projekt (kreator)">
      <div className="flex max-w-lg flex-col gap-6">
        <Stepper
          steps={STEPS.map((s) => ({ id: s.id, label: s.label }))}
          current={wizard.stepIndex}
        />
        {stepBody}
        <div className="flex gap-2">
          {!wizard.isFirst && (
            <Button variant="secondary" onClick={wizard.prev}>
              Wstecz
            </Button>
          )}
          {!wizard.isLast && <Button onClick={wizard.next}>Dalej</Button>}
          {wizard.isLast && (
            <Button onClick={wizard.submit} disabled={wizard.isSubmitting}>
              Utwórz
            </Button>
          )}
        </div>
      </div>
    </Page>
  );
}
