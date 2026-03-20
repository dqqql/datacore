"use client";

import { useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { restoreCharacterAction } from "@/app/characters/actions";
import { Modal } from "@/components/modal";

type ArchivedCharacter = {
  id: string;
  name: string;
};

type ArchivedCharactersRestoreDialogProps = {
  accountName: string;
  archivedCharacters: ArchivedCharacter[];
};

function RestoreButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      className="focus-ring btn-secondary btn-compact"
      disabled={pending}
    >
      {pending ? "恢复中..." : "恢复"}
    </button>
  );
}

export function ArchivedCharactersRestoreDialog({
  accountName,
  archivedCharacters,
}: ArchivedCharactersRestoreDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const archivedCountLabel = useMemo(
    () => `查看 ${archivedCharacters.length} 个`,
    [archivedCharacters.length],
  );

  if (archivedCharacters.length === 0) {
    return <span className="text-sm text-[var(--muted)]">无</span>;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="focus-ring btn-secondary btn-compact"
      >
        {archivedCountLabel}
      </button>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={`恢复归档角色 · ${accountName}`}
      >
        <div className="space-y-4">
          <p className="text-sm leading-6 text-[var(--muted)]">
            这里列出该账号当前所有归档角色。你可以按需要逐个恢复，恢复后角色会重新回到玩家角色列表中。
          </p>

          <div className="space-y-3">
            {archivedCharacters.map((character) => (
              <form
                key={character.id}
                action={restoreCharacterAction}
                className="flex items-center justify-between gap-3 rounded-[20px] border border-[var(--border-soft)] bg-[rgba(255,250,241,0.82)] px-4 py-3"
              >
                <input type="hidden" name="characterId" value={character.id} />
                <div className="min-w-0">
                  <p className="truncate font-semibold text-[var(--color-ink-900)]">{character.name}</p>
                  <p className="text-xs leading-5 text-[var(--muted)]">归档角色</p>
                </div>
                <RestoreButton />
              </form>
            ))}
          </div>
        </div>
      </Modal>
    </>
  );
}
