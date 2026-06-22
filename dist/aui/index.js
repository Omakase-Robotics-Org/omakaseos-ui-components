import { createContext as e, forwardRef as t, memo as n, useCallback as r, useContext as i, useEffect as a, useLayoutEffect as o, useRef as s, useState as c } from "react";
import { AlertCircleIcon as l, ArrowDownIcon as u, ArrowUpIcon as d, BrainIcon as f, CheckIcon as p, ChevronDownIcon as m, ChevronLeftIcon as h, ChevronRightIcon as g, CopyIcon as _, DownloadIcon as v, FileText as y, LoaderIcon as b, MicIcon as x, MicOffIcon as ee, MoreHorizontalIcon as te, PencilIcon as ne, PhoneIcon as re, PhoneOffIcon as ie, PlusIcon as ae, RefreshCwIcon as oe, SquareIcon as se, XCircleIcon as ce, XIcon as le } from "lucide-react";
import { ActionBarMorePrimitive as S, ActionBarPrimitive as C, AssistantRuntimeProvider as ue, AttachmentPrimitive as de, AuiIf as w, BranchPickerPrimitive as T, ComposerPrimitive as E, ErrorPrimitive as fe, MessagePrimitive as D, ReadonlyThreadProvider as pe, SuggestionPrimitive as me, ThreadPrimitive as O, fromThreadMessageLike as he, groupPartByType as ge, useAui as _e, useAuiState as k, useLocalRuntime as ve, useScrollLock as ye, useToolCallElapsed as be, useVoiceControls as xe, useVoiceState as Se, useVoiceVolume as Ce } from "@assistant-ui/react";
import { useShallow as we } from "zustand/shallow";
import { Avatar as Te, Collapsible as Ee, Dialog as A, Slot as De, Tooltip as j } from "radix-ui";
import { clsx as Oe } from "clsx";
import { twMerge as ke } from "tailwind-merge";
import { jsx as M, jsxs as N } from "react/jsx-runtime";
import { cva as P } from "class-variance-authority";
import { MarkdownTextPrimitive as Ae, unstable_memoizeMarkdownComponents as je, useIsMarkdownCodeBlock as Me } from "@assistant-ui/react-markdown";
import Ne from "remark-gfm";
//#region src/aui/lib/cn.ts
function F(...e) {
	return ke(Oe(e));
}
//#endregion
//#region src/aui/ui/tooltip.tsx
function Pe({ delayDuration: e = 0, ...t }) {
	return /* @__PURE__ */ M(j.Provider, {
		"data-slot": "tooltip-provider",
		delayDuration: e,
		...t
	});
}
function Fe({ ...e }) {
	return /* @__PURE__ */ M(j.Root, {
		"data-slot": "tooltip",
		...e
	});
}
function Ie({ ...e }) {
	return /* @__PURE__ */ M(j.Trigger, {
		"data-slot": "tooltip-trigger",
		...e
	});
}
function Le({ className: e, sideOffset: t = 0, children: n, ...r }) {
	return /* @__PURE__ */ M(j.Portal, { children: /* @__PURE__ */ N(j.Content, {
		"data-slot": "tooltip-content",
		sideOffset: t,
		className: F("z-50 w-fit origin-(--radix-tooltip-content-transform-origin) animate-in rounded-md bg-foreground px-3 py-1.5 text-xs text-balance text-background fade-in-0 zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95", e),
		...r,
		children: [n, /* @__PURE__ */ M(j.Arrow, { className: "z-50 size-2.5 translate-y-[calc(-50%_-_2px)] rotate-45 rounded-[2px] bg-foreground fill-foreground" })]
	}) });
}
//#endregion
//#region src/aui/ui/button.tsx
var Re = P("inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4", {
	variants: {
		variant: {
			default: "bg-primary text-primary-foreground hover:bg-primary/90",
			destructive: "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:bg-destructive/60 dark:focus-visible:ring-destructive/40",
			outline: "border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
			secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
			ghost: "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
			link: "text-primary underline-offset-4 hover:underline"
		},
		size: {
			default: "h-9 px-4 py-2 has-[>svg]:px-3",
			xs: "h-6 gap-1 rounded-md px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
			sm: "h-8 gap-1.5 rounded-md px-3 has-[>svg]:px-2.5",
			lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
			icon: "size-9",
			"icon-xs": "size-6 rounded-md [&_svg:not([class*='size-'])]:size-3",
			"icon-sm": "size-8",
			"icon-lg": "size-10"
		}
	},
	defaultVariants: {
		variant: "default",
		size: "default"
	}
});
function I({ className: e, variant: t = "default", size: n = "default", asChild: r = !1, ...i }) {
	return /* @__PURE__ */ M(r ? De.Root : "button", {
		"data-slot": "button",
		"data-variant": t,
		"data-size": n,
		className: F(Re({
			variant: t,
			size: n,
			className: e
		})),
		...i
	});
}
//#endregion
//#region src/aui/ui/dialog.tsx
function ze({ ...e }) {
	return /* @__PURE__ */ M(A.Root, {
		"data-slot": "dialog",
		...e
	});
}
function Be({ ...e }) {
	return /* @__PURE__ */ M(A.Trigger, {
		"data-slot": "dialog-trigger",
		...e
	});
}
function Ve({ ...e }) {
	return /* @__PURE__ */ M(A.Portal, {
		"data-slot": "dialog-portal",
		...e
	});
}
function He({ ...e }) {
	return /* @__PURE__ */ M(A.Close, {
		"data-slot": "dialog-close",
		...e
	});
}
function Ue({ className: e, ...t }) {
	return /* @__PURE__ */ M(A.Overlay, {
		"data-slot": "dialog-overlay",
		className: F("fixed inset-0 z-50 bg-black/50 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0", e),
		...t
	});
}
function We({ className: e, children: t, showCloseButton: n = !0, ...r }) {
	return /* @__PURE__ */ N(Ve, {
		"data-slot": "dialog-portal",
		children: [/* @__PURE__ */ M(Ue, {}), /* @__PURE__ */ N(A.Content, {
			"data-slot": "dialog-content",
			className: F("fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border bg-background p-6 shadow-lg duration-200 outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 sm:max-w-lg", e),
			...r,
			children: [t, n && /* @__PURE__ */ N(A.Close, {
				"data-slot": "dialog-close",
				className: "absolute top-4 right-4 rounded-xs opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
				children: [/* @__PURE__ */ M(le, {}), /* @__PURE__ */ M("span", {
					className: "sr-only",
					children: "Close"
				})]
			})]
		})]
	});
}
function Ge({ className: e, ...t }) {
	return /* @__PURE__ */ M("div", {
		"data-slot": "dialog-header",
		className: F("flex flex-col gap-2 text-center sm:text-left", e),
		...t
	});
}
function Ke({ className: e, showCloseButton: t = !1, children: n, ...r }) {
	return /* @__PURE__ */ N("div", {
		"data-slot": "dialog-footer",
		className: F("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", e),
		...r,
		children: [n, t && /* @__PURE__ */ M(A.Close, {
			asChild: !0,
			children: /* @__PURE__ */ M(I, {
				variant: "outline",
				children: "Close"
			})
		})]
	});
}
function qe({ className: e, ...t }) {
	return /* @__PURE__ */ M(A.Title, {
		"data-slot": "dialog-title",
		className: F("text-lg leading-none font-semibold", e),
		...t
	});
}
function Je({ className: e, ...t }) {
	return /* @__PURE__ */ M(A.Description, {
		"data-slot": "dialog-description",
		className: F("text-sm text-muted-foreground", e),
		...t
	});
}
//#endregion
//#region src/aui/ui/avatar.tsx
function Ye({ className: e, size: t = "default", ...n }) {
	return /* @__PURE__ */ M(Te.Root, {
		"data-slot": "avatar",
		"data-size": t,
		className: F("group/avatar relative flex size-8 shrink-0 overflow-hidden rounded-full select-none data-[size=lg]:size-10 data-[size=sm]:size-6", e),
		...n
	});
}
function Xe({ className: e, ...t }) {
	return /* @__PURE__ */ M(Te.Image, {
		"data-slot": "avatar-image",
		className: F("aspect-square size-full", e),
		...t
	});
}
function Ze({ className: e, ...t }) {
	return /* @__PURE__ */ M(Te.Fallback, {
		"data-slot": "avatar-fallback",
		className: F("flex size-full items-center justify-center rounded-full bg-muted text-sm text-muted-foreground group-data-[size=sm]/avatar:text-xs", e),
		...t
	});
}
//#endregion
//#region src/aui/tooltip-icon-button.tsx
var L = t(({ children: e, tooltip: t, side: n = "bottom", className: r, ...i }, a) => /* @__PURE__ */ M(Pe, {
	delayDuration: 0,
	children: /* @__PURE__ */ N(Fe, { children: [/* @__PURE__ */ M(Ie, {
		asChild: !0,
		children: /* @__PURE__ */ N(I, {
			variant: "ghost",
			size: "icon",
			...i,
			className: F("aui-button-icon size-6 p-1 active:scale-90", r),
			ref: a,
			children: [/* @__PURE__ */ M(De.Slottable, { children: e }), /* @__PURE__ */ M("span", {
				className: "aui-sr-only sr-only",
				children: t
			})]
		})
	}), /* @__PURE__ */ M(Le, {
		side: n,
		children: t
	})] })
}));
L.displayName = "TooltipIconButton";
//#endregion
//#region src/aui/attachment.tsx
var Qe = (e) => {
	let [t, n] = c(void 0);
	return a(() => {
		if (!e) {
			n(void 0);
			return;
		}
		let t = URL.createObjectURL(e);
		return n(t), () => {
			URL.revokeObjectURL(t);
		};
	}, [e]), t;
}, $e = () => {
	let { file: e, src: t } = k(we((e) => {
		if (e.attachment.type !== "image") return {};
		if (e.attachment.file) return { file: e.attachment.file };
		let t = e.attachment.content?.filter((e) => e.type === "image")[0]?.image;
		return t ? { src: t } : {};
	}));
	return Qe(e) ?? t;
}, et = ({ src: e }) => {
	let [t, n] = c(!1);
	return /* @__PURE__ */ M("img", {
		src: e,
		alt: "Attachment preview",
		className: F("block h-auto max-h-[80vh] w-auto max-w-full object-contain", t ? "aui-attachment-preview-image-loaded" : "aui-attachment-preview-image-loading invisible"),
		onLoad: () => n(!0)
	});
}, tt = ({ children: e }) => {
	let t = $e();
	return t ? /* @__PURE__ */ N(ze, { children: [/* @__PURE__ */ M(Be, {
		className: "aui-attachment-preview-trigger hover:bg-accent/50 cursor-pointer transition-colors",
		asChild: !0,
		children: e
	}), /* @__PURE__ */ N(We, {
		className: "aui-attachment-preview-dialog-content [&>button]:bg-foreground/60 [&_svg]:text-background [&>button]:hover:[&_svg]:text-destructive p-2 sm:max-w-3xl [&>button]:rounded-full [&>button]:p-1 [&>button]:opacity-100 [&>button]:ring-0!",
		children: [/* @__PURE__ */ M(qe, {
			className: "aui-sr-only sr-only",
			children: "Image Attachment Preview"
		}), /* @__PURE__ */ M("div", {
			className: "aui-attachment-preview bg-background relative mx-auto flex max-h-[80dvh] w-full items-center justify-center overflow-hidden",
			children: /* @__PURE__ */ M(et, { src: t })
		})]
	})] }) : e;
}, nt = () => /* @__PURE__ */ N(Ye, {
	className: "aui-attachment-tile-avatar h-full w-full rounded-none",
	children: [/* @__PURE__ */ M(Xe, {
		src: $e(),
		alt: "Attachment preview",
		className: "aui-attachment-tile-image object-cover"
	}), /* @__PURE__ */ M(Ze, { children: /* @__PURE__ */ M(y, { className: "aui-attachment-tile-fallback-icon text-muted-foreground size-8" }) })]
}), rt = () => {
	let e = _e().attachment.source !== "message", t = k((e) => e.attachment.type === "image"), n = k((e) => {
		let t = e.attachment.type;
		switch (t) {
			case "image": return "Image";
			case "document": return "Document";
			case "file": return "File";
			default: return t;
		}
	});
	return /* @__PURE__ */ N(Fe, { children: [/* @__PURE__ */ N(de.Root, {
		className: F("aui-attachment-root relative", t && !e && "aui-attachment-root-message only:*:first:size-24"),
		children: [/* @__PURE__ */ M(tt, { children: /* @__PURE__ */ M(Ie, {
			asChild: !0,
			children: /* @__PURE__ */ M("div", {
				className: "aui-attachment-tile bg-muted size-14 cursor-pointer overflow-hidden rounded-[calc(var(--composer-radius)-var(--composer-padding))] border transition-opacity hover:opacity-75",
				role: "button",
				tabIndex: 0,
				"aria-label": `${n} attachment`,
				children: /* @__PURE__ */ M(nt, {})
			})
		}) }), e && /* @__PURE__ */ M(it, {})]
	}), /* @__PURE__ */ M(Le, {
		side: "top",
		children: /* @__PURE__ */ M(de.Name, {})
	})] });
}, it = () => /* @__PURE__ */ M(de.Remove, {
	asChild: !0,
	children: /* @__PURE__ */ M(L, {
		tooltip: "Remove file",
		className: "aui-attachment-tile-remove text-muted-foreground hover:[&_svg]:text-destructive absolute end-1.5 top-1.5 size-3.5 rounded-full bg-white opacity-100 shadow-sm hover:bg-white! [&_svg]:text-black",
		side: "top",
		children: /* @__PURE__ */ M(le, { className: "aui-attachment-remove-icon size-3 dark:stroke-[2.5px]" })
	})
}), at = () => /* @__PURE__ */ M("div", {
	className: "aui-user-message-attachments-end col-span-full col-start-1 row-start-1 flex w-full flex-row justify-end gap-2",
	children: /* @__PURE__ */ M(D.Attachments, { children: () => /* @__PURE__ */ M(rt, {}) })
}), ot = () => /* @__PURE__ */ M("div", {
	className: "aui-composer-attachments flex w-full flex-row items-center gap-2 overflow-x-auto empty:hidden",
	children: /* @__PURE__ */ M(E.Attachments, { children: () => /* @__PURE__ */ M(rt, {}) })
}), st = () => /* @__PURE__ */ M(E.AddAttachment, {
	asChild: !0,
	children: /* @__PURE__ */ M(L, {
		tooltip: "Add Attachment",
		side: "bottom",
		variant: "ghost",
		size: "icon",
		className: "aui-composer-add-attachment hover:bg-muted-foreground/15 dark:border-muted-foreground/15 dark:hover:bg-muted-foreground/30 size-7 rounded-full p-1 text-xs font-semibold",
		"aria-label": "Add Attachment",
		children: /* @__PURE__ */ M(ae, { className: "aui-attachment-add-icon size-4.5 stroke-[1.5px]" })
	})
}), ct = n(() => /* @__PURE__ */ M(Ae, {
	remarkPlugins: [Ne],
	className: "aui-md",
	components: dt,
	defer: !0
})), lt = ({ language: e, code: t }) => {
	let { isCopied: n, copyToClipboard: r } = ut();
	return /* @__PURE__ */ N("div", {
		className: "aui-code-header-root border-border/50 bg-muted/50 mt-3 flex items-center justify-between rounded-t-xl border border-b-0 px-3.5 py-1.5 text-xs",
		children: [/* @__PURE__ */ M("span", {
			className: "aui-code-header-language text-muted-foreground font-medium lowercase",
			children: e
		}), /* @__PURE__ */ N(L, {
			tooltip: "Copy",
			onClick: () => {
				!t || n || r(t);
			},
			children: [!n && /* @__PURE__ */ M(_, { className: "animate-in zoom-in-75 fade-in duration-150" }), n && /* @__PURE__ */ M(p, { className: "animate-in zoom-in-50 fade-in duration-200 ease-out" })]
		})]
	});
}, ut = ({ copiedDuration: e = 3e3 } = {}) => {
	let [t, n] = c(!1);
	return {
		isCopied: t,
		copyToClipboard: (t) => {
			!t || typeof navigator > "u" || !navigator.clipboard || navigator.clipboard.writeText(t).then(() => {
				n(!0), setTimeout(() => n(!1), e);
			}, () => {});
		}
	};
}, dt = je({
	h1: ({ className: e, ...t }) => /* @__PURE__ */ M("h1", {
		className: F("aui-md-h1 mt-5 mb-2 scroll-m-20 text-xl font-semibold first:mt-0 last:mb-0", e),
		...t
	}),
	h2: ({ className: e, ...t }) => /* @__PURE__ */ M("h2", {
		className: F("aui-md-h2 mt-5 mb-2 scroll-m-20 text-lg font-semibold first:mt-0 last:mb-0", e),
		...t
	}),
	h3: ({ className: e, ...t }) => /* @__PURE__ */ M("h3", {
		className: F("aui-md-h3 mt-4 mb-1.5 scroll-m-20 text-base font-semibold first:mt-0 last:mb-0", e),
		...t
	}),
	h4: ({ className: e, ...t }) => /* @__PURE__ */ M("h4", {
		className: F("aui-md-h4 mt-3.5 mb-1 scroll-m-20 text-base font-medium first:mt-0 last:mb-0", e),
		...t
	}),
	h5: ({ className: e, ...t }) => /* @__PURE__ */ M("h5", {
		className: F("aui-md-h5 mt-3 mb-1 text-sm font-semibold first:mt-0 last:mb-0", e),
		...t
	}),
	h6: ({ className: e, ...t }) => /* @__PURE__ */ M("h6", {
		className: F("aui-md-h6 mt-3 mb-1 text-sm font-medium first:mt-0 last:mb-0", e),
		...t
	}),
	p: ({ className: e, ...t }) => /* @__PURE__ */ M("p", {
		className: F("aui-md-p my-3 leading-relaxed first:mt-0 last:mb-0", e),
		...t
	}),
	a: ({ className: e, ...t }) => /* @__PURE__ */ M("a", {
		className: F("aui-md-a text-primary hover:text-primary/80 underline underline-offset-2", e),
		...t
	}),
	blockquote: ({ className: e, ...t }) => /* @__PURE__ */ M("blockquote", {
		className: F("aui-md-blockquote border-muted-foreground/30 text-muted-foreground my-3 border-s-2 ps-4", e),
		...t
	}),
	ul: ({ className: e, ...t }) => /* @__PURE__ */ M("ul", {
		className: F("aui-md-ul marker:text-muted-foreground my-3 ms-5 list-disc [&>li]:mt-1", e),
		...t
	}),
	ol: ({ className: e, ...t }) => /* @__PURE__ */ M("ol", {
		className: F("aui-md-ol marker:text-muted-foreground my-3 ms-5 list-decimal [&>li]:mt-1", e),
		...t
	}),
	hr: ({ className: e, ...t }) => /* @__PURE__ */ M("hr", {
		className: F("aui-md-hr border-muted-foreground/20 my-3", e),
		...t
	}),
	table: ({ className: e, ...t }) => /* @__PURE__ */ M("table", {
		className: F("aui-md-table my-3 w-full border-separate border-spacing-0 overflow-y-auto", e),
		...t
	}),
	th: ({ className: e, ...t }) => /* @__PURE__ */ M("th", {
		className: F("aui-md-th bg-muted px-3 py-1.5 text-start font-medium first:rounded-ss-lg last:rounded-se-lg [[align=center]]:text-center [[align=right]]:text-right", e),
		...t
	}),
	td: ({ className: e, ...t }) => /* @__PURE__ */ M("td", {
		className: F("aui-md-td border-muted-foreground/20 border-s border-b px-3 py-1.5 text-start last:border-e [[align=center]]:text-center [[align=right]]:text-right", e),
		...t
	}),
	tr: ({ className: e, ...t }) => /* @__PURE__ */ M("tr", {
		className: F("aui-md-tr m-0 border-b p-0 first:border-t [&:last-child>td:first-child]:rounded-es-lg [&:last-child>td:last-child]:rounded-ee-lg", e),
		...t
	}),
	li: ({ className: e, ...t }) => /* @__PURE__ */ M("li", {
		className: F("aui-md-li leading-relaxed", e),
		...t
	}),
	strong: ({ className: e, ...t }) => /* @__PURE__ */ M("strong", {
		className: F("aui-md-strong font-semibold", e),
		...t
	}),
	sup: ({ className: e, ...t }) => /* @__PURE__ */ M("sup", {
		className: F("aui-md-sup [&>a]:text-xs [&>a]:no-underline", e),
		...t
	}),
	pre: ({ className: e, ...t }) => /* @__PURE__ */ M("pre", {
		className: F("aui-md-pre border-border/50 bg-muted/30 overflow-x-auto rounded-t-none rounded-b-xl border border-t-0 p-3.5 text-[13px] leading-relaxed", e),
		...t
	}),
	code: function({ className: e, ...t }) {
		return /* @__PURE__ */ M("code", {
			className: F(!Me() && "aui-md-inline-code bg-muted rounded-md px-1.5 py-0.5 font-mono text-[0.85em]", e),
			...t
		});
	},
	CodeHeader: lt
});
//#endregion
//#region src/aui/ui/collapsible.tsx
function R({ ...e }) {
	return /* @__PURE__ */ M(Ee.Root, {
		"data-slot": "collapsible",
		...e
	});
}
function z({ ...e }) {
	return /* @__PURE__ */ M(Ee.CollapsibleTrigger, {
		"data-slot": "collapsible-trigger",
		...e
	});
}
function B({ ...e }) {
	return /* @__PURE__ */ M(Ee.CollapsibleContent, {
		"data-slot": "collapsible-content",
		...e
	});
}
//#endregion
//#region src/aui/reasoning.tsx
var ft = 200, pt = e(!1), mt = P("aui-reasoning-root mb-4 w-full", {
	variants: { variant: {
		outline: "rounded-lg border px-3 py-2",
		ghost: "",
		muted: "bg-muted/50 rounded-lg px-3 py-2"
	} },
	defaultVariants: { variant: "outline" }
});
function V({ className: e, variant: t, open: n, onOpenChange: i, defaultOpen: a = !1, streaming: l, children: u, ...d }) {
	let f = s(null), p = s(a), [m, h] = c(null), g = ye(f, ft), _ = n !== void 0, v = _ ? n : m ?? l ?? p.current, y = l === !0 && v && (_ || m === null), b = s(l);
	return o(() => {
		b.current !== l && (b.current = l, !_ && m === null && g());
	}, [
		l,
		_,
		m,
		g
	]), /* @__PURE__ */ M(R, {
		ref: f,
		"data-slot": "reasoning-root",
		"data-variant": t,
		open: v,
		onOpenChange: r((e) => {
			g(), _ || h(e), i?.(e);
		}, [
			g,
			_,
			i
		]),
		className: F("group/reasoning-root", mt({
			variant: t,
			className: e
		})),
		style: { "--animation-duration": `${ft}ms` },
		...d,
		children: /* @__PURE__ */ M(pt.Provider, {
			value: y,
			children: u
		})
	});
}
function ht({ side: e = "bottom", className: t, ...n }) {
	return e === "top" ? /* @__PURE__ */ M("div", {
		"data-slot": "reasoning-fade",
		className: F("aui-reasoning-fade pointer-events-none absolute inset-x-0 top-0 z-10 h-8", "bg-[linear-gradient(to_bottom,var(--color-background),transparent)]", "group-data-[variant=muted]/reasoning-root:bg-[linear-gradient(to_bottom,hsl(var(--muted)/0.5),transparent)]", "fade-in-0 animate-in", "duration-(--animation-duration)", t),
		...n
	}) : /* @__PURE__ */ M("div", {
		"data-slot": "reasoning-fade",
		className: F("aui-reasoning-fade pointer-events-none absolute inset-x-0 bottom-0 z-10 h-8", "bg-[linear-gradient(to_top,var(--color-background),transparent)]", "group-data-[variant=muted]/reasoning-root:bg-[linear-gradient(to_top,hsl(var(--muted)/0.5),transparent)]", "fade-in-0 animate-in", "group-data-[state=open]/collapsible-content:animate-out", "group-data-[state=open]/collapsible-content:fade-out-0", "group-data-[state=open]/collapsible-content:delay-[calc(var(--animation-duration)*0.75)]", "group-data-[state=open]/collapsible-content:fill-mode-forwards", "duration-(--animation-duration)", "group-data-[state=open]/collapsible-content:duration-(--animation-duration)", t),
		...n
	});
}
function H({ active: e, duration: t, className: n, ...r }) {
	let i = t ? ` (${t}s)` : "";
	return /* @__PURE__ */ N(z, {
		"data-slot": "reasoning-trigger",
		className: F("aui-reasoning-trigger group/trigger text-muted-foreground hover:text-foreground flex max-w-[75%] items-center gap-2 py-1 text-sm transition-colors", n),
		...r,
		children: [
			/* @__PURE__ */ M(f, {
				"data-slot": "reasoning-trigger-icon",
				className: "aui-reasoning-trigger-icon size-4 shrink-0"
			}),
			/* @__PURE__ */ N("span", {
				"data-slot": "reasoning-trigger-label",
				className: "aui-reasoning-trigger-label-wrapper relative inline-block leading-none",
				children: [/* @__PURE__ */ N("span", { children: ["Reasoning", i] }), e ? /* @__PURE__ */ N("span", {
					"aria-hidden": !0,
					"data-slot": "reasoning-trigger-shimmer",
					className: "aui-reasoning-trigger-shimmer shimmer pointer-events-none absolute inset-0 motion-reduce:animate-none",
					children: ["Reasoning", i]
				}) : null]
			}),
			/* @__PURE__ */ M(m, {
				"data-slot": "reasoning-trigger-chevron",
				className: F("aui-reasoning-trigger-chevron mt-0.5 size-4 shrink-0", "transition-transform duration-(--animation-duration) ease-out", "group-data-[state=closed]/trigger:-rotate-90", "group-data-[state=open]/trigger:rotate-0")
			})
		]
	});
}
function U({ className: e, children: t, ...n }) {
	let r = i(pt);
	return /* @__PURE__ */ N(B, {
		"data-slot": "reasoning-content",
		className: F("aui-reasoning-content text-muted-foreground relative overflow-hidden text-sm outline-none", "group/collapsible-content ease-out", "data-[state=closed]:animate-collapsible-up", "data-[state=open]:animate-collapsible-down", "data-[state=closed]:fill-mode-forwards", "data-[state=closed]:pointer-events-none", "data-[state=open]:duration-(--animation-duration)", "data-[state=closed]:duration-(--animation-duration)", e),
		...n,
		children: [
			r ? /* @__PURE__ */ M(ht, { side: "top" }) : null,
			t,
			/* @__PURE__ */ M(ht, {})
		]
	});
}
function W({ className: e, children: t, ...n }) {
	let r = i(pt), o = s(null), c = s(null);
	return a(() => {
		if (!r) return;
		let e = o.current, t = c.current;
		if (!e || !t) return;
		let n = () => {
			e.scrollTop = e.scrollHeight;
		};
		n();
		let i = new ResizeObserver(n);
		return i.observe(t), () => i.disconnect();
	}, [r]), /* @__PURE__ */ M("div", {
		ref: o,
		"data-slot": "reasoning-text",
		className: F("aui-reasoning-text relative z-0 max-h-64 overflow-y-auto ps-6 pt-2 pb-2 leading-relaxed", "transform-gpu transition-[transform,opacity]", "group-data-[state=open]/collapsible-content:animate-in", "group-data-[state=closed]/collapsible-content:animate-out", "group-data-[state=open]/collapsible-content:fade-in-0", "group-data-[state=closed]/collapsible-content:fade-out-0", "group-data-[state=open]/collapsible-content:slide-in-from-top-4", "group-data-[state=closed]/collapsible-content:slide-out-to-top-4", "group-data-[state=open]/collapsible-content:duration-(--animation-duration)", "group-data-[state=closed]/collapsible-content:duration-(--animation-duration)", e),
		...n,
		children: /* @__PURE__ */ M("div", {
			ref: c,
			className: "aui-reasoning-text-content space-y-4",
			children: t
		})
	});
}
var gt = () => /* @__PURE__ */ M(ct, {}), _t = ({ children: e, startIndex: t, endIndex: n }) => {
	let r = k((e) => {
		if (e.message.status?.type !== "running") return !1;
		let r = e.message.parts.length - 1;
		return r < 0 || e.message.parts[r]?.type !== "reasoning" ? !1 : r >= t && r <= n;
	});
	return /* @__PURE__ */ N(V, {
		streaming: r,
		children: [/* @__PURE__ */ M(H, { active: r }), /* @__PURE__ */ M(U, {
			"aria-busy": r,
			children: /* @__PURE__ */ M(W, { children: e })
		})]
	});
}, G = n(gt);
G.displayName = "Reasoning", G.Root = V, G.Trigger = H, G.Content = U, G.Text = W, G.Fade = ht;
var vt = n(_t);
vt.displayName = "ReasoningGroup";
//#endregion
//#region src/aui/tool-fallback.tsx
var yt = 200;
function bt({ className: e, open: t, onOpenChange: n, defaultOpen: i = !1, children: a, ...o }) {
	let l = s(null), [u, d] = c(i), f = ye(l, yt), p = t !== void 0;
	return /* @__PURE__ */ M(R, {
		ref: l,
		"data-slot": "tool-fallback-root",
		open: p ? t : u,
		onOpenChange: r((e) => {
			f(), p || d(e), n?.(e);
		}, [
			f,
			p,
			n
		]),
		className: F("aui-tool-fallback-root group/tool-fallback-root w-full", e),
		style: { "--animation-duration": `${yt}ms` },
		...o,
		children: a
	});
}
var xt = {
	running: b,
	complete: p,
	incomplete: ce,
	"requires-action": l
}, St = (e) => {
	if (e < 1e3) return "<1s";
	let t = e / 1e3;
	return t < 10 ? `${(Math.floor(t * 10) / 10).toFixed(1)}s` : t < 60 ? `${Math.floor(t)}s` : `${Math.floor(t / 60)}m ${Math.floor(t % 60)}s`;
};
function Ct({ className: e, ...t }) {
	let n = be();
	return n === void 0 ? null : /* @__PURE__ */ M("span", {
		"data-slot": "tool-fallback-duration",
		className: F("aui-tool-fallback-duration text-muted-foreground text-xs tabular-nums", e),
		...t,
		children: St(n)
	});
}
function wt({ toolName: e, status: t, className: n, ...r }) {
	let i = t?.type ?? "complete", a = i === "running", o = t?.type === "incomplete" && t.reason === "cancelled", s = xt[i], c = o ? "Cancelled tool" : "Used tool";
	return /* @__PURE__ */ N(z, {
		"data-slot": "tool-fallback-trigger",
		className: F("aui-tool-fallback-trigger group/trigger text-muted-foreground hover:text-foreground flex w-fit items-center gap-2 py-1 text-sm transition-colors", n),
		...r,
		children: [
			/* @__PURE__ */ M(s, {
				"data-slot": "tool-fallback-trigger-icon",
				className: F("aui-tool-fallback-trigger-icon size-4 shrink-0", o && "text-muted-foreground", a && "animate-spin")
			}),
			/* @__PURE__ */ N("span", {
				"data-slot": "tool-fallback-trigger-label",
				className: F("aui-tool-fallback-trigger-label-wrapper relative inline-block text-start leading-none", o && "text-muted-foreground line-through"),
				children: [/* @__PURE__ */ N("span", { children: [
					c,
					": ",
					/* @__PURE__ */ M("b", { children: e })
				] }), a && /* @__PURE__ */ N("span", {
					"aria-hidden": !0,
					"data-slot": "tool-fallback-trigger-shimmer",
					className: "aui-tool-fallback-trigger-shimmer shimmer pointer-events-none absolute inset-0 motion-reduce:animate-none",
					children: [
						c,
						": ",
						/* @__PURE__ */ M("b", { children: e })
					]
				})]
			}),
			/* @__PURE__ */ M(Ct, {}),
			/* @__PURE__ */ M(m, {
				"data-slot": "tool-fallback-trigger-chevron",
				className: F("aui-tool-fallback-trigger-chevron size-4 shrink-0", "transition-transform duration-(--animation-duration) ease-out", "group-data-[state=closed]/trigger:-rotate-90", "group-data-[state=open]/trigger:rotate-0")
			})
		]
	});
}
function Tt({ className: e, children: t, ...n }) {
	return /* @__PURE__ */ M(B, {
		"data-slot": "tool-fallback-content",
		className: F("aui-tool-fallback-content relative overflow-hidden text-sm outline-none", "group/collapsible-content ease-out", "data-[state=closed]:animate-collapsible-up", "data-[state=open]:animate-collapsible-down", "data-[state=closed]:fill-mode-forwards", "data-[state=closed]:pointer-events-none", "data-[state=open]:duration-(--animation-duration)", "data-[state=closed]:duration-(--animation-duration)", e),
		...n,
		children: /* @__PURE__ */ M("div", {
			className: "flex flex-col gap-2 ps-6 pt-1 pb-2",
			children: t
		})
	});
}
function Et({ argsText: e, className: t, ...n }) {
	return e ? /* @__PURE__ */ M("div", {
		"data-slot": "tool-fallback-args",
		className: F("aui-tool-fallback-args", t),
		...n,
		children: /* @__PURE__ */ M("pre", {
			className: "aui-tool-fallback-args-value bg-muted/50 text-muted-foreground rounded-md p-2.5 text-xs whitespace-pre-wrap",
			children: e
		})
	}) : null;
}
function Dt({ result: e, className: t, ...n }) {
	return e === void 0 ? null : /* @__PURE__ */ N("div", {
		"data-slot": "tool-fallback-result",
		className: F("aui-tool-fallback-result", t),
		...n,
		children: [/* @__PURE__ */ M("p", {
			className: "aui-tool-fallback-result-header text-muted-foreground text-xs font-medium",
			children: "Result:"
		}), /* @__PURE__ */ M("pre", {
			className: "aui-tool-fallback-result-content bg-muted/50 text-muted-foreground mt-1 rounded-md p-2.5 text-xs whitespace-pre-wrap",
			children: typeof e == "string" ? e : JSON.stringify(e, null, 2)
		})]
	});
}
function Ot({ status: e, className: t, ...n }) {
	if (e?.type !== "incomplete") return null;
	let r = e.error, i = r ? typeof r == "string" ? r : JSON.stringify(r) : null;
	if (!i) return null;
	let a = e.reason === "cancelled" ? "Cancelled reason:" : "Error:";
	return /* @__PURE__ */ N("div", {
		"data-slot": "tool-fallback-error",
		className: F("aui-tool-fallback-error", t),
		...n,
		children: [/* @__PURE__ */ M("p", {
			className: "aui-tool-fallback-error-header text-muted-foreground font-semibold",
			children: a
		}), /* @__PURE__ */ M("p", {
			className: "aui-tool-fallback-error-reason text-muted-foreground",
			children: i
		})]
	});
}
var kt = "Approved by user", At = "User denied tool execution", K = {
	"allow-once": "Allow",
	"allow-always": "Always allow",
	"reject-once": "Deny",
	"reject-always": "Always deny"
}, jt = (e) => e === "allow-once" || e === "allow-always", Mt = (e) => e.label ?? (Object.hasOwn(K, e.kind) ? K[e.kind] : void 0) ?? e.id;
function Nt({ className: e, addResult: t, resume: n, interrupt: r, approval: i, respondToApproval: a, ...o }) {
	let [s, l] = c(!1), [u, d] = c(null);
	if (i != null && (i.approved !== void 0 || i.resolution !== void 0)) return null;
	let f = a ? i?.options : void 0, p = f?.filter((e) => Object.hasOwn(K, e.kind)), m = (e) => {
		s || (i != null && i.approved === void 0 && a ? a({ approved: e }) : r ? n?.({ approved: e }) : t?.(e ? kt : At), l(!0));
	}, h = (e) => {
		s || (a?.({ optionId: e.id }), l(!0), d(null));
	}, g = (e) => {
		e.confirm ? d(e.id) : h(e);
	}, _ = u == null ? void 0 : p?.find((e) => e.id === u);
	if (_) {
		let t = typeof _.confirm == "object" ? _.confirm : void 0, n = t?.description ?? _.description;
		return /* @__PURE__ */ N("div", {
			"data-slot": "tool-fallback-approval-confirm",
			className: F("aui-tool-fallback-approval-confirm flex flex-col gap-2 pt-1", e),
			...o,
			children: [
				/* @__PURE__ */ M("p", {
					className: "aui-tool-fallback-approval-confirm-title font-semibold",
					children: t?.title ?? `${Mt(_)}?`
				}),
				n && /* @__PURE__ */ M("p", {
					className: "aui-tool-fallback-approval-confirm-description text-muted-foreground",
					children: n
				}),
				_.grants && _.grants.length > 0 && /* @__PURE__ */ M("ul", {
					className: "aui-tool-fallback-approval-confirm-grants flex flex-col gap-1",
					children: _.grants.map((e) => /* @__PURE__ */ M("li", { children: /* @__PURE__ */ M("code", {
						className: "aui-tool-fallback-approval-confirm-grant bg-muted rounded px-1.5 py-0.5 text-xs",
						children: e
					}) }, e))
				}),
				/* @__PURE__ */ N("div", {
					className: "flex items-center gap-2",
					children: [/* @__PURE__ */ M(I, {
						size: "sm",
						onClick: () => h(_),
						disabled: s,
						children: "Confirm"
					}), /* @__PURE__ */ M(I, {
						size: "sm",
						variant: "outline",
						onClick: () => d(null),
						disabled: s,
						children: "Back"
					})]
				})
			]
		});
	}
	if (f && f.length > 0) {
		let t = p?.filter((e) => jt(e.kind)) ?? [], n = p?.filter((e) => !jt(e.kind)) ?? [];
		return /* @__PURE__ */ N("div", {
			"data-slot": "tool-fallback-approval",
			className: F("aui-tool-fallback-approval flex flex-wrap items-center gap-2 pt-1", e),
			...o,
			children: [[...t, ...n].map((e) => /* @__PURE__ */ M(I, {
				size: "sm",
				variant: e === t[0] ? "default" : "outline",
				onClick: () => g(e),
				disabled: s,
				children: Mt(e)
			}, e.id)), n.length === 0 && /* @__PURE__ */ M(I, {
				size: "sm",
				variant: "outline",
				onClick: () => m(!1),
				disabled: s,
				children: "Deny"
			})]
		});
	}
	return /* @__PURE__ */ N("div", {
		"data-slot": "tool-fallback-approval",
		className: F("aui-tool-fallback-approval flex items-center gap-2 pt-1", e),
		...o,
		children: [/* @__PURE__ */ M(I, {
			size: "sm",
			onClick: () => m(!0),
			disabled: s,
			children: "Allow"
		}), /* @__PURE__ */ M(I, {
			size: "sm",
			variant: "outline",
			onClick: () => m(!1),
			disabled: s,
			children: "Deny"
		})]
	});
}
var q = n(({ toolName: e, argsText: t, result: n, status: r, addResult: i, resume: a, interrupt: o, approval: s, respondToApproval: l }) => {
	let u = r?.type === "incomplete" && r.reason === "cancelled", d = r?.type === "requires-action", [f, p] = c(d), [m, h] = c(d);
	return d !== m && (h(d), d && p(!0)), /* @__PURE__ */ N(bt, {
		open: f,
		onOpenChange: p,
		children: [/* @__PURE__ */ M(wt, {
			toolName: e,
			status: r
		}), /* @__PURE__ */ N(Tt, { children: [
			/* @__PURE__ */ M(Ot, { status: r }),
			/* @__PURE__ */ M(Et, {
				argsText: t,
				className: F(u && "opacity-60")
			}),
			d && /* @__PURE__ */ M(Nt, {
				addResult: i,
				resume: a,
				interrupt: o,
				approval: s,
				respondToApproval: l
			}),
			!u && /* @__PURE__ */ M(Dt, { result: n })
		] })]
	});
});
q.displayName = "ToolFallback", q.Root = bt, q.Trigger = wt, q.Content = Tt, q.Args = Et, q.Result = Dt, q.Error = Ot, q.Approval = Nt;
//#endregion
//#region src/aui/tool-group.tsx
var Pt = 200, Ft = P("aui-tool-group-root group/tool-group w-full", {
	variants: { variant: {
		outline: "rounded-lg border py-3",
		ghost: "",
		muted: "border-muted-foreground/30 bg-muted/30 rounded-lg border py-3"
	} },
	defaultVariants: { variant: "outline" }
});
function J({ className: e, variant: t, open: n, onOpenChange: i, defaultOpen: a = !1, children: o, ...l }) {
	let u = s(null), [d, f] = c(a), p = ye(u, Pt), m = n !== void 0, h = m ? n : d, g = r((e) => {
		p(), m || f(e), i?.(e);
	}, [
		p,
		m,
		i
	]);
	return /* @__PURE__ */ M(R, {
		ref: u,
		"data-slot": "tool-group-root",
		"data-variant": t ?? "outline",
		open: h,
		onOpenChange: g,
		className: F(Ft({ variant: t }), "group/tool-group-root", e),
		style: { "--animation-duration": `${Pt}ms` },
		...l,
		children: o
	});
}
function Y({ count: e, active: t = !1, className: n, ...r }) {
	let i = `${e} tool ${e === 1 ? "call" : "calls"}`;
	return /* @__PURE__ */ N(z, {
		"data-slot": "tool-group-trigger",
		className: F("aui-tool-group-trigger group/trigger flex items-center gap-2 text-sm transition-colors", "group-data-[variant=ghost]/tool-group-root:text-muted-foreground group-data-[variant=ghost]/tool-group-root:hover:text-foreground group-data-[variant=ghost]/tool-group-root:py-1", "group-data-[variant=outline]/tool-group-root:w-full group-data-[variant=outline]/tool-group-root:px-4", "group-data-[variant=muted]/tool-group-root:w-full group-data-[variant=muted]/tool-group-root:px-4", n),
		...r,
		children: [
			t && /* @__PURE__ */ M(b, {
				"data-slot": "tool-group-trigger-loader",
				className: "aui-tool-group-trigger-loader size-4 shrink-0 animate-spin"
			}),
			/* @__PURE__ */ N("span", {
				"data-slot": "tool-group-trigger-label",
				className: F("aui-tool-group-trigger-label-wrapper relative inline-block text-start leading-none font-medium", "group-data-[variant=ghost]/tool-group-root:font-normal", "group-data-[variant=outline]/tool-group-root:grow", "group-data-[variant=muted]/tool-group-root:grow"),
				children: [/* @__PURE__ */ M("span", { children: i }), t && /* @__PURE__ */ M("span", {
					"aria-hidden": !0,
					"data-slot": "tool-group-trigger-shimmer",
					className: "aui-tool-group-trigger-shimmer shimmer pointer-events-none absolute inset-0 motion-reduce:animate-none",
					children: i
				})]
			}),
			/* @__PURE__ */ M(m, {
				"data-slot": "tool-group-trigger-chevron",
				className: F("aui-tool-group-trigger-chevron size-4 shrink-0", "transition-transform duration-(--animation-duration) ease-out", "group-data-[state=closed]/trigger:-rotate-90", "group-data-[state=open]/trigger:rotate-0")
			})
		]
	});
}
function X({ className: e, children: t, ...n }) {
	return /* @__PURE__ */ M(B, {
		"data-slot": "tool-group-content",
		className: F("aui-tool-group-content relative overflow-hidden text-sm outline-none", "group/collapsible-content ease-out", "data-[state=closed]:animate-collapsible-up", "data-[state=open]:animate-collapsible-down", "data-[state=closed]:fill-mode-forwards", "data-[state=closed]:pointer-events-none", "data-[state=open]:duration-(--animation-duration)", "data-[state=closed]:duration-(--animation-duration)", e),
		...n,
		children: /* @__PURE__ */ M("div", {
			className: F("mt-2 flex flex-col gap-2", "group-data-[variant=ghost]/tool-group-root:mt-1 group-data-[variant=ghost]/tool-group-root:gap-1", "group-data-[variant=outline]/tool-group-root:mt-3 group-data-[variant=outline]/tool-group-root:border-t group-data-[variant=outline]/tool-group-root:px-4 group-data-[variant=outline]/tool-group-root:pt-3", "group-data-[variant=muted]/tool-group-root:mt-3 group-data-[variant=muted]/tool-group-root:border-t group-data-[variant=muted]/tool-group-root:px-4 group-data-[variant=muted]/tool-group-root:pt-3"),
			children: t
		})
	});
}
var Z = n(({ children: e, startIndex: t, endIndex: n }) => /* @__PURE__ */ N(J, { children: [/* @__PURE__ */ M(Y, { count: n - t + 1 }), /* @__PURE__ */ M(X, { children: e })] }));
Z.displayName = "ToolGroup", Z.Root = J, Z.Trigger = Y, Z.Content = X;
//#endregion
//#region src/aui/thread.tsx
var It = {}, Q = e(It), Lt = (e) => e.thread.messages.length === 0 && (!e.thread.isLoading || e.threads.isLoading), Rt = ({ components: e = It }) => {
	let t = k(Lt);
	return /* @__PURE__ */ M(Q.Provider, {
		value: e,
		children: /* @__PURE__ */ M(zt, { isEmpty: t })
	});
}, zt = ({ isEmpty: e }) => {
	let { Welcome: t = Ht } = i(Q);
	return /* @__PURE__ */ M(O.Root, {
		className: "aui-root aui-thread-root bg-background @container flex h-full flex-col",
		style: {
			"--thread-max-width": "44rem",
			"--composer-bg": "color-mix(in oklab, var(--color-muted) 30%, var(--color-background))",
			"--composer-radius": "1.5rem",
			"--composer-padding": "8px"
		},
		children: /* @__PURE__ */ M(O.Viewport, {
			turnAnchor: "top",
			"data-slot": "aui_thread-viewport",
			className: "relative flex flex-1 flex-col overflow-x-auto overflow-y-scroll scroll-smooth",
			children: /* @__PURE__ */ N("div", {
				className: F("mx-auto flex w-full max-w-(--thread-max-width) flex-1 flex-col px-4 pt-4", e && "justify-center"),
				children: [
					/* @__PURE__ */ M(w, {
						condition: Lt,
						children: /* @__PURE__ */ M(t, {})
					}),
					/* @__PURE__ */ M("div", {
						"data-slot": "aui_message-group",
						className: "mb-14 flex flex-col gap-y-6 empty:hidden",
						children: /* @__PURE__ */ M(O.Messages, { children: () => /* @__PURE__ */ M(Bt, {}) })
					}),
					/* @__PURE__ */ N(O.ViewportFooter, {
						className: F("aui-thread-viewport-footer bg-background flex flex-col gap-4 overflow-visible pb-4 md:pb-6", !e && "sticky bottom-0 mt-auto rounded-t-(--composer-radius)"),
						children: [
							/* @__PURE__ */ M(Vt, {}),
							/* @__PURE__ */ M(Gt, {}),
							/* @__PURE__ */ M(w, {
								condition: (e) => Lt(e) && e.composer.isEmpty,
								children: /* @__PURE__ */ M(Ut, {})
							})
						]
					})
				]
			})
		})
	});
}, Bt = () => {
	let { AssistantMessage: e = Jt } = i(Q), t = k((e) => e.message.role);
	return k((e) => e.message.composer.isEditing) ? /* @__PURE__ */ M(Qt, {}) : M(t === "user" ? Xt : e, {});
}, Vt = () => /* @__PURE__ */ M(O.ScrollToBottom, {
	asChild: !0,
	children: /* @__PURE__ */ M(L, {
		tooltip: "Scroll to bottom",
		variant: "outline",
		className: "aui-thread-scroll-to-bottom dark:border-border dark:bg-background dark:hover:bg-accent absolute -top-12 z-10 self-center rounded-full p-4 disabled:invisible",
		children: /* @__PURE__ */ M(u, {})
	})
}), Ht = () => /* @__PURE__ */ M("div", {
	className: "aui-thread-welcome-root mb-6 flex flex-col items-center px-4 text-center",
	children: /* @__PURE__ */ M("h1", {
		className: "aui-thread-welcome-message-inner fade-in slide-in-from-bottom-1 animate-in fill-mode-both text-2xl font-semibold duration-200",
		children: "How can I help you today?"
	})
}), Ut = () => /* @__PURE__ */ M("div", {
	className: "aui-thread-welcome-suggestions flex w-full flex-wrap items-center justify-center gap-2 px-4",
	children: /* @__PURE__ */ M(O.Suggestions, { children: () => /* @__PURE__ */ M(Wt, {}) })
}), Wt = () => /* @__PURE__ */ M("div", {
	className: "aui-thread-welcome-suggestion-display fade-in slide-in-from-bottom-2 animate-in fill-mode-both duration-200",
	children: /* @__PURE__ */ M(me.Trigger, {
		send: !0,
		asChild: !0,
		children: /* @__PURE__ */ N(I, {
			variant: "ghost",
			className: "aui-thread-welcome-suggestion text-foreground hover:bg-muted border-border/60 h-auto gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-normal whitespace-nowrap transition-colors",
			children: [/* @__PURE__ */ M(me.Title, { className: "aui-thread-welcome-suggestion-text-1" }), /* @__PURE__ */ M(me.Description, { className: "aui-thread-welcome-suggestion-text-2 empty:hidden" })]
		})
	})
}), Gt = () => /* @__PURE__ */ M(E.Root, {
	className: "aui-composer-root relative flex w-full flex-col",
	children: /* @__PURE__ */ M(E.AttachmentDropzone, {
		asChild: !0,
		children: /* @__PURE__ */ N("div", {
			"data-slot": "aui_composer-shell",
			className: "border-border/60 data-[dragging=true]:border-ring focus-within:border-border dark:border-muted-foreground/15 dark:focus-within:border-muted-foreground/30 flex w-full flex-col gap-2 rounded-(--composer-radius) border bg-(--composer-bg) p-(--composer-padding) shadow-[0_4px_16px_-8px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)] transition-[border-color,box-shadow] focus-within:shadow-[0_6px_24px_-8px_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.05)] data-[dragging=true]:border-dashed data-[dragging=true]:bg-[color-mix(in_oklab,var(--color-accent)_50%,var(--color-background))] dark:shadow-none",
			children: [
				/* @__PURE__ */ M(ot, {}),
				/* @__PURE__ */ M(E.Input, {
					placeholder: "Send a message...",
					className: "aui-composer-input placeholder:text-muted-foreground/80 max-h-32 min-h-10 w-full resize-none bg-transparent px-2.5 py-1 text-base outline-none",
					rows: 1,
					autoFocus: !0,
					"aria-label": "Message input"
				}),
				/* @__PURE__ */ M(Kt, {})
			]
		})
	})
}), Kt = () => /* @__PURE__ */ N("div", {
	className: "aui-composer-action-wrapper relative flex items-center justify-between",
	children: [/* @__PURE__ */ M(st, {}), /* @__PURE__ */ N("div", {
		className: "flex items-center gap-1.5",
		children: [
			/* @__PURE__ */ N(w, {
				condition: (e) => e.thread.capabilities.dictation,
				children: [/* @__PURE__ */ M(w, {
					condition: (e) => e.composer.dictation == null,
					children: /* @__PURE__ */ M(E.Dictate, {
						asChild: !0,
						children: /* @__PURE__ */ M(L, {
							tooltip: "Voice input",
							side: "bottom",
							type: "button",
							variant: "ghost",
							size: "icon",
							className: "aui-composer-dictate size-7 rounded-full",
							"aria-label": "Start voice input",
							children: /* @__PURE__ */ M(x, { className: "aui-composer-dictate-icon size-4" })
						})
					})
				}), /* @__PURE__ */ M(w, {
					condition: (e) => e.composer.dictation != null,
					children: /* @__PURE__ */ M(E.StopDictation, {
						asChild: !0,
						children: /* @__PURE__ */ M(L, {
							tooltip: "Stop dictation",
							side: "bottom",
							type: "button",
							variant: "ghost",
							size: "icon",
							className: "aui-composer-stop-dictation text-destructive size-7 rounded-full",
							"aria-label": "Stop voice input",
							children: /* @__PURE__ */ M(se, { className: "aui-composer-stop-dictation-icon size-3.5 animate-pulse fill-current" })
						})
					})
				})]
			}),
			/* @__PURE__ */ M(w, {
				condition: (e) => !e.thread.isRunning,
				children: /* @__PURE__ */ M(E.Send, {
					asChild: !0,
					children: /* @__PURE__ */ M(L, {
						tooltip: "Send message",
						side: "bottom",
						type: "button",
						variant: "default",
						size: "icon",
						className: "aui-composer-send size-7 rounded-full",
						"aria-label": "Send message",
						children: /* @__PURE__ */ M(d, { className: "aui-composer-send-icon size-4.5" })
					})
				})
			}),
			/* @__PURE__ */ M(w, {
				condition: (e) => e.thread.isRunning,
				children: /* @__PURE__ */ M(E.Cancel, {
					asChild: !0,
					children: /* @__PURE__ */ M(I, {
						type: "button",
						variant: "default",
						size: "icon",
						className: "aui-composer-cancel size-7 rounded-full",
						"aria-label": "Stop generating",
						children: /* @__PURE__ */ M(se, { className: "aui-composer-cancel-icon size-3.5 fill-current" })
					})
				})
			})
		]
	})]
}), qt = () => /* @__PURE__ */ M(D.Error, { children: /* @__PURE__ */ M(fe.Root, {
	className: "aui-message-error-root border-destructive bg-destructive/10 text-destructive dark:bg-destructive/5 mt-2 rounded-md border p-3 text-sm dark:text-red-200",
	children: /* @__PURE__ */ M(fe.Message, { className: "aui-message-error-message line-clamp-2" })
}) }), Jt = () => {
	let { ToolFallback: e = q, ToolGroup: t, ReasoningGroup: n } = i(Q);
	return /* @__PURE__ */ N(D.Root, {
		"data-slot": "aui_assistant-message-root",
		"data-role": "assistant",
		className: "fade-in slide-in-from-bottom-1 animate-in relative duration-150",
		children: [/* @__PURE__ */ N("div", {
			"data-slot": "aui_assistant-message-content",
			className: "text-foreground px-2 leading-relaxed wrap-break-word [contain-intrinsic-size:auto_24px] [content-visibility:auto]",
			children: [/* @__PURE__ */ M(D.GroupedParts, {
				groupBy: ge({
					reasoning: ["group-chainOfThought", "group-reasoning"],
					"tool-call": ["group-chainOfThought", "group-tool"],
					"standalone-tool-call": []
				}),
				children: ({ part: r, children: i }) => {
					switch (r.type) {
						case "group-chainOfThought": return /* @__PURE__ */ M("div", {
							"data-slot": "aui_chain-of-thought",
							children: i
						});
						case "group-tool": return t ? /* @__PURE__ */ M(t, {
							group: r,
							children: i
						}) : /* @__PURE__ */ N(J, {
							variant: "ghost",
							children: [/* @__PURE__ */ M(Y, {
								count: r.indices.length,
								active: r.status.type === "running"
							}), /* @__PURE__ */ M(X, { children: i })]
						});
						case "group-reasoning": {
							if (n) return /* @__PURE__ */ M(n, {
								group: r,
								children: i
							});
							let e = r.status.type === "running";
							return /* @__PURE__ */ N(V, {
								streaming: e,
								children: [/* @__PURE__ */ M(H, { active: e }), /* @__PURE__ */ M(U, {
									"aria-busy": e,
									children: /* @__PURE__ */ M(W, { children: i })
								})]
							});
						}
						case "text": return /* @__PURE__ */ M(ct, {});
						case "reasoning": return /* @__PURE__ */ M(G, { ...r });
						case "tool-call": return r.toolUI ?? /* @__PURE__ */ M(e, { ...r });
						case "data": return r.dataRendererUI;
						case "indicator": return /* @__PURE__ */ M("span", {
							"data-slot": "aui_assistant-message-indicator",
							className: "animate-pulse font-sans",
							"aria-label": "Assistant is working",
							children: "●"
						});
						default: return null;
					}
				}
			}), /* @__PURE__ */ M(qt, {})]
		}), /* @__PURE__ */ N("div", {
			"data-slot": "aui_assistant-message-footer",
			className: F("ms-2 flex items-center", "-mb-7.5 min-h-7.5 pt-1.5"),
			children: [/* @__PURE__ */ M($t, {}), /* @__PURE__ */ M(Yt, {})]
		})]
	});
}, Yt = () => /* @__PURE__ */ N(C.Root, {
	hideWhenRunning: !0,
	autohide: "not-last",
	className: "aui-assistant-action-bar-root text-muted-foreground animate-in fade-in col-start-3 row-start-2 -ms-1 flex gap-1 duration-200",
	children: [
		/* @__PURE__ */ M(C.Copy, {
			asChild: !0,
			children: /* @__PURE__ */ N(L, {
				tooltip: "Copy",
				children: [/* @__PURE__ */ M(w, {
					condition: (e) => e.message.isCopied,
					children: /* @__PURE__ */ M(p, { className: "animate-in zoom-in-50 fade-in duration-200 ease-out" })
				}), /* @__PURE__ */ M(w, {
					condition: (e) => !e.message.isCopied,
					children: /* @__PURE__ */ M(_, { className: "animate-in zoom-in-75 fade-in duration-150" })
				})]
			})
		}),
		/* @__PURE__ */ M(C.Reload, {
			asChild: !0,
			children: /* @__PURE__ */ M(L, {
				tooltip: "Refresh",
				children: /* @__PURE__ */ M(oe, {})
			})
		}),
		/* @__PURE__ */ N(S.Root, { children: [/* @__PURE__ */ M(S.Trigger, {
			asChild: !0,
			children: /* @__PURE__ */ M(L, {
				tooltip: "More",
				className: "data-[state=open]:bg-accent",
				children: /* @__PURE__ */ M(te, {})
			})
		}), /* @__PURE__ */ M(S.Content, {
			side: "bottom",
			align: "start",
			sideOffset: 6,
			className: "aui-action-bar-more-content bg-popover/95 text-popover-foreground data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=closed]:animate-out data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 min-w-[8rem] overflow-hidden rounded-xl border p-1.5 shadow-lg backdrop-blur-sm",
			children: /* @__PURE__ */ M(C.ExportMarkdown, {
				asChild: !0,
				children: /* @__PURE__ */ N(S.Item, {
					className: "aui-action-bar-more-item hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm outline-none select-none",
					children: [/* @__PURE__ */ M(v, { className: "size-4" }), "Export as Markdown"]
				})
			})
		})] })
	]
}), Xt = () => /* @__PURE__ */ N(D.Root, {
	"data-slot": "aui_user-message-root",
	className: "fade-in slide-in-from-bottom-1 animate-in grid auto-rows-auto grid-cols-[minmax(72px,1fr)_auto] content-start gap-y-2 px-2 duration-150 [contain-intrinsic-size:auto_60px] [content-visibility:auto] [&:where(>*)]:col-start-2",
	"data-role": "user",
	children: [
		/* @__PURE__ */ M(at, {}),
		/* @__PURE__ */ N("div", {
			className: "aui-user-message-content-wrapper relative col-start-2 min-w-0",
			children: [/* @__PURE__ */ M("div", {
				className: "aui-user-message-content peer bg-muted text-foreground rounded-xl px-4 py-2 wrap-break-word empty:hidden",
				children: /* @__PURE__ */ M(D.Parts, {})
			}), /* @__PURE__ */ M("div", {
				className: "aui-user-action-bar-wrapper absolute start-0 top-1/2 -translate-x-full -translate-y-1/2 pe-2 peer-empty:hidden rtl:translate-x-full",
				children: /* @__PURE__ */ M(Zt, {})
			})]
		}),
		/* @__PURE__ */ M($t, {
			"data-slot": "aui_user-branch-picker",
			className: "col-span-full col-start-1 row-start-3 -me-1 justify-end"
		})
	]
}), Zt = () => /* @__PURE__ */ M(C.Root, {
	hideWhenRunning: !0,
	autohide: "not-last",
	className: "aui-user-action-bar-root flex flex-col items-end",
	children: /* @__PURE__ */ M(C.Edit, {
		asChild: !0,
		children: /* @__PURE__ */ M(L, {
			tooltip: "Edit",
			className: "aui-user-action-edit",
			children: /* @__PURE__ */ M(ne, {})
		})
	})
}), Qt = () => /* @__PURE__ */ M(D.Root, {
	"data-slot": "aui_edit-composer-wrapper",
	className: "flex flex-col px-2",
	children: /* @__PURE__ */ N(E.Root, {
		className: "aui-edit-composer-root border-border/60 dark:border-muted-foreground/15 ms-auto flex w-full max-w-[85%] flex-col rounded-(--composer-radius) border bg-(--composer-bg) shadow-[0_4px_16px_-8px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-none",
		children: [/* @__PURE__ */ M(E.Input, {
			className: "aui-edit-composer-input text-foreground min-h-14 w-full resize-none bg-transparent px-4 pt-3 pb-1 text-base outline-none",
			autoFocus: !0
		}), /* @__PURE__ */ N("div", {
			className: "aui-edit-composer-footer mx-2.5 mb-2.5 flex items-center gap-1.5 self-end",
			children: [/* @__PURE__ */ M(E.Cancel, {
				asChild: !0,
				children: /* @__PURE__ */ M(I, {
					variant: "ghost",
					size: "sm",
					className: "h-8 rounded-full px-3.5",
					children: "Cancel"
				})
			}), /* @__PURE__ */ M(E.Send, {
				asChild: !0,
				children: /* @__PURE__ */ M(I, {
					size: "sm",
					className: "h-8 rounded-full px-3.5",
					children: "Update"
				})
			})]
		})]
	})
}), $t = ({ className: e, ...t }) => /* @__PURE__ */ N(T.Root, {
	hideWhenSingleBranch: !0,
	className: F("aui-branch-picker-root text-muted-foreground -ms-2 me-2 inline-flex items-center text-xs", e),
	...t,
	children: [
		/* @__PURE__ */ M(T.Previous, {
			asChild: !0,
			children: /* @__PURE__ */ M(L, {
				tooltip: "Previous",
				children: /* @__PURE__ */ M(h, {})
			})
		}),
		/* @__PURE__ */ N("span", {
			className: "aui-branch-picker-state font-medium",
			children: [
				/* @__PURE__ */ M(T.Number, {}),
				" / ",
				/* @__PURE__ */ M(T.Count, {})
			]
		}),
		/* @__PURE__ */ M(T.Next, {
			asChild: !0,
			children: /* @__PURE__ */ M(L, {
				tooltip: "Next",
				children: /* @__PURE__ */ M(g, {})
			})
		})
	]
}), en = {
	default: [
		[
			.55,
			.55,
			.6
		],
		[
			.7,
			.7,
			.75
		],
		[
			.4,
			.4,
			.45
		]
	],
	blue: [
		[
			.2,
			.5,
			1
		],
		[
			.4,
			.7,
			1
		],
		[
			.1,
			.3,
			.8
		]
	],
	violet: [
		[
			.6,
			.3,
			1
		],
		[
			.8,
			.5,
			1
		],
		[
			.4,
			.15,
			.8
		]
	],
	emerald: [
		[
			.15,
			.75,
			.55
		],
		[
			.3,
			.9,
			.7
		],
		[
			.1,
			.55,
			.4
		]
	]
}, tn = {
	idle: {
		speed: .15,
		amplitude: .04,
		glow: .15,
		brightness: .55,
		pulse: 0,
		saturation: .7
	},
	connecting: {
		speed: .5,
		amplitude: .1,
		glow: .45,
		brightness: .75,
		pulse: 1,
		saturation: .9
	},
	listening: {
		speed: .4,
		amplitude: .14,
		glow: .5,
		brightness: .85,
		pulse: 0,
		saturation: 1
	},
	speaking: {
		speed: 1.4,
		amplitude: .35,
		glow: .9,
		brightness: 1,
		pulse: 0,
		saturation: 1
	},
	muted: {
		speed: .06,
		amplitude: .015,
		glow: .08,
		brightness: .35,
		pulse: 0,
		saturation: .2
	}
}, nn = "#version 300 es\nin vec2 a_position;\nout vec2 v_uv;\nvoid main() {\n  v_uv = a_position * 0.5 + 0.5;\n  gl_Position = vec4(a_position, 0.0, 1.0);\n}", rn = "#version 300 es\nprecision highp float;\n\nin vec2 v_uv;\nout vec4 fragColor;\n\nuniform float u_time;\nuniform float u_speed;\nuniform float u_amplitude;\nuniform float u_glow;\nuniform float u_brightness;\nuniform float u_pulse;\nuniform float u_saturation;\nuniform vec3 u_color0;\nuniform vec3 u_color1;\nuniform vec3 u_color2;\nuniform float u_dpr;\n\n// Simplex-like noise (3D)\nvec3 mod289(vec3 x) { return x - floor(x / 289.0) * 289.0; }\nvec4 mod289(vec4 x) { return x - floor(x / 289.0) * 289.0; }\nvec4 permute(vec4 x) { return mod289((x * 34.0 + 1.0) * x); }\nvec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }\n\nfloat snoise(vec3 v) {\n  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);\n  vec3 i = floor(v + dot(v, vec3(C.y)));\n  vec3 x0 = v - i + dot(i, vec3(C.x));\n  vec3 g = step(x0.yzx, x0.xyz);\n  vec3 l = 1.0 - g;\n  vec3 i1 = min(g, l.zxy);\n  vec3 i2 = max(g, l.zxy);\n  vec3 x1 = x0 - i1 + C.x;\n  vec3 x2 = x0 - i2 + C.y;\n  vec3 x3 = x0 - 0.5;\n  i = mod289(i);\n  vec4 p = permute(permute(permute(\n    i.z + vec4(0.0, i1.z, i2.z, 1.0))\n    + i.y + vec4(0.0, i1.y, i2.y, 1.0))\n    + i.x + vec4(0.0, i1.x, i2.x, 1.0));\n  vec4 j = p - 49.0 * floor(p / 49.0);\n  vec4 x_ = floor(j / 7.0);\n  vec4 y_ = floor(j - 7.0 * x_);\n  vec4 x = (x_ * 2.0 + 0.5) / 7.0 - 1.0;\n  vec4 y = (y_ * 2.0 + 0.5) / 7.0 - 1.0;\n  vec4 h = 1.0 - abs(x) - abs(y);\n  vec4 b0 = vec4(x.xy, y.xy);\n  vec4 b1 = vec4(x.zw, y.zw);\n  vec4 s0 = floor(b0) * 2.0 + 1.0;\n  vec4 s1 = floor(b1) * 2.0 + 1.0;\n  vec4 sh = -step(h, vec4(0.0));\n  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;\n  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;\n  vec3 g0 = vec3(a0.xy, h.x);\n  vec3 g1 = vec3(a0.zw, h.y);\n  vec3 g2 = vec3(a1.xy, h.z);\n  vec3 g3 = vec3(a1.zw, h.w);\n  vec4 norm = taylorInvSqrt(vec4(dot(g0,g0), dot(g1,g1), dot(g2,g2), dot(g3,g3)));\n  g0 *= norm.x; g1 *= norm.y; g2 *= norm.z; g3 *= norm.w;\n  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);\n  m = m * m;\n  return 42.0 * dot(m * m, vec4(dot(g0,x0), dot(g1,x1), dot(g2,x2), dot(g3,x3)));\n}\n\nvoid main() {\n  vec2 uv = v_uv * 2.0 - 1.0;\n  float dist = length(uv);\n  float t = u_time * u_speed;\n\n  // Perfect circle — hard boundary, soft anti-aliased edge\n  float radius = 0.44;\n  float circle = 1.0 - smoothstep(radius - 0.008, radius + 0.008, dist);\n\n  if (circle < 0.001) {\n    // Outer glow only\n    float glowDist = dist - radius;\n    float glow = exp(-glowDist * 12.0) * u_glow * 0.4;\n    vec3 glowColor = mix(u_color0, u_color1, 0.5);\n    fragColor = vec4(glowColor * glow, glow);\n    return;\n  }\n\n  float n1 = snoise(vec3(uv * 2.0, t * 0.6)) * 0.5 + 0.5;\n  float n2 = snoise(vec3(uv * 3.5 + 7.0, t * 0.9)) * 0.5 + 0.5;\n  float n3 = snoise(vec3(uv * 1.5 - 3.0, t * 0.4 + 10.0)) * 0.5 + 0.5;\n\n  vec2 distort = vec2(\n    snoise(vec3(uv * 2.0 + 5.0, t * 0.7)),\n    snoise(vec3(uv * 2.0 + 15.0, t * 0.7))\n  ) * u_amplitude * 2.0;\n  float n4 = snoise(vec3((uv + distort) * 3.0, t * 0.5)) * 0.5 + 0.5;\n\n  vec3 col = mix(u_color0, u_color1, n1);\n  col = mix(col, u_color2, n2 * 0.5);\n  col = mix(col, u_color1 * 1.3, n4 * 0.4);\n\n  float vein = pow(n3, 3.0) * u_amplitude * 6.0;\n  col += vein * mix(u_color1, vec3(1.0), 0.3);\n\n  float centerDist = dist / radius;\n  float depthShade = 1.0 - centerDist * centerDist * 0.4;\n  col *= depthShade;\n\n  float rim = pow(centerDist, 4.0) * 0.6;\n  col += rim * mix(u_color0, vec3(1.0), 0.5);\n\n  vec2 lightPos = vec2(-0.15, -0.18);\n  float specDist = length(uv - lightPos);\n  float spec = exp(-specDist * specDist * 30.0) * 0.7;\n  col += spec * vec3(1.0);\n\n  vec2 lightPos2 = vec2(0.2, 0.25);\n  float spec2 = exp(-length(uv - lightPos2) * 8.0) * 0.15;\n  col += spec2 * u_color1;\n\n  float pulseFactor = 1.0 + u_pulse * sin(u_time * 3.5) * 0.35;\n\n  float lum = dot(col, vec3(0.299, 0.587, 0.114));\n  col = mix(vec3(lum), col, u_saturation);\n\n  col *= u_brightness * pulseFactor;\n\n  fragColor = vec4(col, circle);\n}";
function an(e, t, n) {
	let r = e.createShader(t);
	return r ? (e.shaderSource(r, n), e.compileShader(r), e.getShaderParameter(r, e.COMPILE_STATUS) ? r : (e.deleteShader(r), null)) : null;
}
function on(e) {
	let t = e.getContext("webgl2", {
		alpha: !0,
		premultipliedAlpha: !1,
		antialias: !0
	});
	if (!t) return null;
	let n = an(t, t.VERTEX_SHADER, nn), r = an(t, t.FRAGMENT_SHADER, rn);
	if (!n || !r) return null;
	let i = t.createProgram();
	if (t.attachShader(i, n), t.attachShader(i, r), t.linkProgram(i), !t.getProgramParameter(i, t.LINK_STATUS)) return null;
	t.useProgram(i);
	let a = t.createBuffer();
	t.bindBuffer(t.ARRAY_BUFFER, a), t.bufferData(t.ARRAY_BUFFER, new Float32Array([
		-1,
		-1,
		1,
		-1,
		-1,
		1,
		1,
		1
	]), t.STATIC_DRAW);
	let o = t.getAttribLocation(i, "a_position");
	return t.enableVertexAttribArray(o), t.vertexAttribPointer(o, 2, t.FLOAT, !1, 0, 0), t.enable(t.BLEND), t.blendFunc(t.SRC_ALPHA, t.ONE_MINUS_SRC_ALPHA), {
		gl: t,
		uniforms: {
			u_time: t.getUniformLocation(i, "u_time"),
			u_speed: t.getUniformLocation(i, "u_speed"),
			u_amplitude: t.getUniformLocation(i, "u_amplitude"),
			u_glow: t.getUniformLocation(i, "u_glow"),
			u_brightness: t.getUniformLocation(i, "u_brightness"),
			u_pulse: t.getUniformLocation(i, "u_pulse"),
			u_saturation: t.getUniformLocation(i, "u_saturation"),
			u_color0: t.getUniformLocation(i, "u_color0"),
			u_color1: t.getUniformLocation(i, "u_color1"),
			u_color2: t.getUniformLocation(i, "u_color2"),
			u_dpr: t.getUniformLocation(i, "u_dpr")
		}
	};
}
function $(e, t, n) {
	return e + (t - e) * n;
}
function sn(e) {
	return e ? e.status.type === "starting" ? "connecting" : e.status.type === "ended" ? "idle" : e.isMuted ? "muted" : e.mode === "speaking" ? "speaking" : "listening" : "idle";
}
var cn = n(({ state: e, variant: t = "default", className: n }) => {
	let i = Se(), o = e ?? sn(i), l = Ce(), u = s(0);
	u.current = l;
	let d = s(null), f = s(null), p = s(0), m = s(performance.now()), h = s({ ...tn.idle }), g = s({ ...tn.idle });
	a(() => {
		g.current = { ...tn[o] };
	}, [o]);
	let _ = en[t], [v, y] = c(!1);
	a(() => {
		let e = requestAnimationFrame(() => y(!0));
		return () => {
			cancelAnimationFrame(e), y(!1);
		};
	}, []);
	let b = r(() => {
		let e = f.current;
		if (!e) return;
		let { gl: t, uniforms: n } = e, r = d.current;
		if (!r) return;
		let i = h.current, a = g.current, o = .045;
		i.speed = $(i.speed, a.speed, o), i.amplitude = $(i.amplitude, a.amplitude, o), i.glow = $(i.glow, a.glow, o), i.brightness = $(i.brightness, a.brightness, o), i.pulse = $(i.pulse, a.pulse, o), i.saturation = $(i.saturation, a.saturation, o);
		let s = (performance.now() - m.current) / 1e3, c = window.devicePixelRatio || 1, l = r.getBoundingClientRect(), v = Math.round(l.width * c), y = Math.round(l.height * c);
		(r.width !== v || r.height !== y) && (r.width = v, r.height = y), t.viewport(0, 0, v, y), t.clearColor(0, 0, 0, 0), t.clear(t.COLOR_BUFFER_BIT);
		let x = u.current;
		t.uniform1f(n.u_time, s), t.uniform1f(n.u_speed, i.speed + x * .4), t.uniform1f(n.u_amplitude, i.amplitude + x * .12), t.uniform1f(n.u_glow, i.glow + x * .2), t.uniform1f(n.u_brightness, i.brightness), t.uniform1f(n.u_pulse, i.pulse), t.uniform1f(n.u_saturation, i.saturation), t.uniform3fv(n.u_color0, _[0]), t.uniform3fv(n.u_color1, _[1]), t.uniform3fv(n.u_color2, _[2]), t.uniform1f(n.u_dpr, c), t.drawArrays(t.TRIANGLE_STRIP, 0, 4), p.current = requestAnimationFrame(b);
	}, [_]);
	return a(() => {
		if (!v) return;
		let e = d.current;
		if (e && (f.current = on(e), f.current)) return p.current = requestAnimationFrame(b), () => {
			cancelAnimationFrame(p.current);
			let e = f.current;
			e && e.gl.getExtension("WEBGL_lose_context")?.loseContext(), f.current = null;
		};
	}, [v, b]), /* @__PURE__ */ M("canvas", {
		ref: d,
		className: F("aui-voice-orb size-16 shrink-0", n),
		"data-state": o
	});
});
cn.displayName = "VoiceOrb";
var ln = ({ className: e }) => /* @__PURE__ */ N("div", {
	className: F("aui-voice-control flex items-center gap-2 border-b px-4 py-2", e),
	children: [
		/* @__PURE__ */ M(un, {}),
		/* @__PURE__ */ M(w, {
			condition: (e) => e.thread.voice == null || e.thread.voice.status.type === "ended",
			children: /* @__PURE__ */ M(dn, {})
		}),
		/* @__PURE__ */ M(w, {
			condition: (e) => e.thread.voice?.status.type === "starting",
			children: /* @__PURE__ */ M("span", {
				className: "aui-voice-status text-muted-foreground text-sm",
				children: "Connecting..."
			})
		}),
		/* @__PURE__ */ N(w, {
			condition: (e) => e.thread.voice?.status.type === "running",
			children: [/* @__PURE__ */ M(fn, {}), /* @__PURE__ */ M(pn, {})]
		})
	]
}), un = () => {
	let e = sn(Se());
	return /* @__PURE__ */ M("span", { className: F("aui-voice-status-dot size-2.5 shrink-0 rounded-full transition-all duration-300", e === "idle" && "bg-muted-foreground", e === "connecting" && "animate-pulse bg-amber-500", e === "listening" && "bg-green-500", e === "speaking" && "bg-green-500", e === "muted" && "bg-destructive") });
}, dn = () => {
	let { connect: e } = xe();
	return /* @__PURE__ */ N(I, {
		variant: "default",
		size: "sm",
		className: "aui-voice-connect gap-1.5 rounded-lg",
		onClick: () => e(),
		children: [/* @__PURE__ */ M(re, { className: "size-4" }), "Connect"]
	});
}, fn = () => {
	let e = Se(), { mute: t, unmute: n } = xe(), r = e?.isMuted ?? !1;
	return /* @__PURE__ */ M(L, {
		tooltip: r ? "Unmute" : "Mute",
		className: "aui-voice-mute",
		onClick: () => r ? n() : t(),
		children: M(r ? ee : x, {})
	});
}, pn = () => {
	let { disconnect: e } = xe();
	return /* @__PURE__ */ M(L, {
		tooltip: "Disconnect",
		className: "aui-voice-disconnect text-destructive hover:text-destructive",
		onClick: () => e(),
		children: /* @__PURE__ */ M(ie, {})
	});
};
//#endregion
export { ue as AssistantRuntimeProvider, Ye as Avatar, Ze as AvatarFallback, Xe as AvatarImage, I as Button, R as Collapsible, B as CollapsibleContent, z as CollapsibleTrigger, st as ComposerAddAttachment, ot as ComposerAttachments, ze as Dialog, He as DialogClose, We as DialogContent, Je as DialogDescription, Ke as DialogFooter, Ge as DialogHeader, Ue as DialogOverlay, Ve as DialogPortal, qe as DialogTitle, Be as DialogTrigger, ct as MarkdownText, pe as ReadonlyThreadProvider, G as Reasoning, U as ReasoningContent, V as ReasoningRoot, W as ReasoningText, H as ReasoningTrigger, Rt as Thread, q as ToolFallback, X as ToolGroupContent, J as ToolGroupRoot, Y as ToolGroupTrigger, Fe as Tooltip, Le as TooltipContent, L as TooltipIconButton, Pe as TooltipProvider, Ie as TooltipTrigger, at as UserMessageAttachments, dn as VoiceConnectButton, ln as VoiceControl, pn as VoiceDisconnectButton, fn as VoiceMuteButton, cn as VoiceOrb, un as VoiceStatusDot, Re as buttonVariants, F as cn, sn as deriveVoiceOrbState, he as fromThreadMessageLike, ve as useLocalRuntime };

//# sourceMappingURL=index.js.map