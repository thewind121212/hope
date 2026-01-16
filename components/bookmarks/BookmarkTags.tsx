import Badge from "@/components/ui/Badge";

interface BookmarkTagsProps {
  tags: string[];
}

export default function BookmarkTags({ tags }: BookmarkTagsProps) {
  if (tags.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1">
      {tags.map((tag) => (
        <Badge key={tag} tone="neutral">
          {tag}
        </Badge>
      ))}
    </div>
  );
}
