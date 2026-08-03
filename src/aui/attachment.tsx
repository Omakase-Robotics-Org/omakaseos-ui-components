"use client";

import { type PropsWithChildren, useEffect, useState, type FC } from "react";
import { XIcon, PlusIcon, FileText } from "lucide-react";
import {
  AttachmentPrimitive,
  ComposerPrimitive,
  MessagePrimitive,
  useAuiState,
  useAui,
} from "@assistant-ui/react";
import { useShallow } from "zustand/shallow";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { TooltipIconButton } from "@/components/assistant-ui/tooltip-icon-button";
import { cn } from "@/lib/utils";
import styles from "./attachment.module.css";

const useFileSrc = (file: File | undefined) => {
  const [src, setSrc] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!file) {
      setSrc(undefined);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setSrc(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  return src;
};

const useAttachmentSrc = () => {
  const { file, src } = useAuiState(
    useShallow((s): { file?: File; src?: string } => {
      if (s.attachment.type !== "image") return {};
      if (s.attachment.file) return { file: s.attachment.file };
      const src = s.attachment.content?.filter((c) => c.type === "image")[0]
        ?.image;
      if (!src) return {};
      return { src };
    }),
  );

  return useFileSrc(file) ?? src;
};

type AttachmentPreviewProps = {
  src: string;
};

const AttachmentPreview: FC<AttachmentPreviewProps> = ({ src }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  return (
    <img
      src={src}
      alt="Attachment preview"
      className={cn(
        styles.preview,
        isLoaded
          ? "aui-attachment-preview-image-loaded"
          : cn("aui-attachment-preview-image-loading", styles.invisibleWhileLoading),
      )}
      onLoad={() => setIsLoaded(true)}
    />
  );
};

const AttachmentPreviewDialog: FC<PropsWithChildren> = ({ children }) => {
  const src = useAttachmentSrc();

  if (!src) return children;

  return (
    <Dialog>
      <DialogTrigger
        className={cn("aui-attachment-preview-trigger", styles.trigger)}
        asChild
      >
        {children}
      </DialogTrigger>
      <DialogContent
        className={cn(
          "aui-attachment-preview-dialog-content",
          styles.dialogContent,
        )}
      >
        <DialogTitle className={cn("aui-sr-only", styles.srOnly)}>
          Image Attachment Preview
        </DialogTitle>
        <div className={cn("aui-attachment-preview", styles.previewWrapper)}>
          <AttachmentPreview src={src} />
        </div>
      </DialogContent>
    </Dialog>
  );
};

const AttachmentThumb: FC = () => {
  const src = useAttachmentSrc();

  return (
    <Avatar className={cn("aui-attachment-tile-avatar", styles.tileAvatar)}>
      <AvatarImage
        src={src}
        alt="Attachment preview"
        className={cn("aui-attachment-tile-image", styles.tileImage)}
      />
      <AvatarFallback>
        <FileText
          className={cn(
            "aui-attachment-tile-fallback-icon",
            styles.tileFallbackIcon,
          )}
        />
      </AvatarFallback>
    </Avatar>
  );
};

const AttachmentUI: FC = () => {
  const aui = useAui();
  const isComposer = aui.attachment.source !== "message";

  const isImage = useAuiState((s) => s.attachment.type === "image");
  const typeLabel = useAuiState((s) => {
    const type = s.attachment.type;
    switch (type) {
      case "image":
        return "Image";
      case "document":
        return "Document";
      case "file":
        return "File";
      default:
        return type;
    }
  });

  return (
    <Tooltip>
      <AttachmentPrimitive.Root
        className={cn(
          "aui-attachment-root",
          styles.root,
          isImage &&
            !isComposer &&
            cn("aui-attachment-root-message", styles.rootMessage),
        )}
      >
        <AttachmentPreviewDialog>
          <TooltipTrigger asChild>
            <div
              className={cn("aui-attachment-tile", styles.tile)}
              role="button"
              tabIndex={0}
              aria-label={`${typeLabel} attachment`}
            >
              <AttachmentThumb />
            </div>
          </TooltipTrigger>
        </AttachmentPreviewDialog>
        {isComposer && <AttachmentRemove />}
      </AttachmentPrimitive.Root>
      <TooltipContent side="top">
        <AttachmentPrimitive.Name />
      </TooltipContent>
    </Tooltip>
  );
};

const AttachmentRemove: FC = () => {
  return (
    <AttachmentPrimitive.Remove asChild>
      <TooltipIconButton
        tooltip="Remove file"
        className={cn("aui-attachment-tile-remove", styles.tileRemove)}
        side="top"
      >
        <XIcon className={cn("aui-attachment-remove-icon", styles.removeIcon)} />
      </TooltipIconButton>
    </AttachmentPrimitive.Remove>
  );
};

export const UserMessageAttachments: FC = () => {
  return (
    <div
      className={cn(
        "aui-user-message-attachments-end",
        styles.userMessageAttachmentsEnd,
      )}
    >
      <MessagePrimitive.Attachments>
        {() => <AttachmentUI />}
      </MessagePrimitive.Attachments>
    </div>
  );
};

export const ComposerAttachments: FC = () => {
  return (
    <div className={cn("aui-composer-attachments", styles.composerAttachments)}>
      <ComposerPrimitive.Attachments>
        {() => <AttachmentUI />}
      </ComposerPrimitive.Attachments>
    </div>
  );
};

export const ComposerAddAttachment: FC = () => {
  return (
    <ComposerPrimitive.AddAttachment asChild>
      <TooltipIconButton
        tooltip="Add Attachment"
        side="bottom"
        variant="ghost"
        size="icon"
        className={cn(
          "aui-composer-add-attachment",
          styles.composerAddAttachment,
        )}
        aria-label="Add Attachment"
      >
        <PlusIcon className={cn("aui-attachment-add-icon", styles.addIcon)} />
      </TooltipIconButton>
    </ComposerPrimitive.AddAttachment>
  );
};

