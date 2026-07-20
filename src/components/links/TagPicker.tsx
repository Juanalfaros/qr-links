import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { HugeiconsIcon } from '@hugeicons/react';
import { PlusSignIcon } from '@hugeicons/core-free-icons';
import type { TagRow } from '@/lib/types';

interface TagPickerProps {
  linkId: string;
  initialTags: TagRow[];
  onTagsChange: (tags: TagRow[]) => void;
}

export function TagPicker({ linkId, initialTags, onTagsChange }: TagPickerProps) {
  const [allTags, setAllTags] = useState<TagRow[]>(initialTags);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(initialTags.map((t) => t.id)));
  const [newTagName, setNewTagName] = useState('');

  useEffect(() => {
    fetch('/api/tags')
      .then((res) => res.json())
      .then((body) => {
        const tags = (body as { tags?: TagRow[] }).tags;
        if (tags) setAllTags(tags);
      });
    // Only needs to run once when the picker mounts (dialog opens).
  }, []);

  const persistTags = async (nextSelected: Set<string>, tagsSource: TagRow[]) => {
    await fetch(`/api/links/${linkId}/tags`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tagIds: Array.from(nextSelected) }),
    });
    onTagsChange(tagsSource.filter((t) => nextSelected.has(t.id)));
  };

  const toggleTag = (tagId: string) => {
    const next = new Set(selectedIds);
    if (next.has(tagId)) next.delete(tagId);
    else next.add(tagId);
    setSelectedIds(next);
    persistTags(next, allTags);
  };

  const handleCreateTag = async (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = newTagName.trim();
    if (!name) return;

    const res = await fetch('/api/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    const body = (await res.json()) as { tag?: TagRow; error?: string };
    if (res.ok && body.tag) {
      const updatedAllTags = [...allTags, body.tag];
      setAllTags(updatedAllTags);
      setNewTagName('');
      const next = new Set(selectedIds).add(body.tag.id);
      setSelectedIds(next);
      persistTags(next, updatedAllTags);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium">Tags</span>
      <div className="flex flex-wrap gap-1.5">
        {allTags.map((tag) => (
          <Badge
            key={tag.id}
            variant={selectedIds.has(tag.id) ? 'default' : 'outline'}
            render={<button type="button" onClick={() => toggleTag(tag.id)} />}
          >
            {tag.name}
          </Badge>
        ))}
      </div>
      <form onSubmit={handleCreateTag} className="flex gap-2">
        <Input
          value={newTagName}
          onChange={(e) => setNewTagName(e.target.value)}
          placeholder="Nuevo tag"
          className="h-7"
        />
        <Button type="submit" variant="outline" size="sm" aria-label="Agregar tag">
          <HugeiconsIcon icon={PlusSignIcon} size={14} />
        </Button>
      </form>
    </div>
  );
}
