import { createContext as e, forwardRef as t, memo as n, useCallback as r, useContext as i, useEffect as a, useLayoutEffect as o, useRef as s, useState as c } from "react";
import { AlertCircleIcon as l, ArrowDownIcon as u, ArrowUpIcon as d, BrainIcon as f, CheckIcon as p, ChevronDownIcon as m, ChevronLeftIcon as h, ChevronRightIcon as g, CopyIcon as _, DownloadIcon as v, FileText as y, LoaderIcon as b, MicIcon as ee, MicOffIcon as te, MoreHorizontalIcon as ne, PencilIcon as re, PhoneIcon as ie, PhoneOffIcon as ae, PlusIcon as oe, RefreshCwIcon as se, SquareIcon as ce, XCircleIcon as le, XIcon as ue } from "lucide-react";
import { ActionBarMorePrimitive as de, ActionBarPrimitive as x, AssistantRuntimeProvider as fe, AttachmentPrimitive as pe, AuiIf as S, BranchPickerPrimitive as me, ComposerPrimitive as C, ErrorPrimitive as he, MessagePrimitive as w, ReadonlyThreadProvider as ge, SuggestionPrimitive as _e, ThreadPrimitive as T, fromThreadMessageLike as ve, groupPartByType as ye, useAui as be, useAuiState as E, useLocalRuntime as xe, useScrollLock as Se, useToolCallElapsed as Ce, useVoiceControls as we, useVoiceState as Te, useVoiceVolume as Ee } from "@assistant-ui/react";
import { useShallow as De } from "zustand/shallow";
import { Avatar as Oe, Collapsible as ke, Dialog as D, Slot as Ae, Tooltip as O } from "radix-ui";
import { clsx as je } from "clsx";
import { jsxDEV as k } from "react/jsx-dev-runtime";
import { cva as Me } from "class-variance-authority";
import { MarkdownTextPrimitive as Ne, unstable_memoizeMarkdownComponents as Pe, useIsMarkdownCodeBlock as Fe } from "@assistant-ui/react-markdown";
import Ie from "remark-gfm";
//#region src/aui/lib/cn.ts
function A(...e) {
	return je(e);
}
var Le = {
	tooltipContent: "_tooltipContent_bi4w5_9",
	tooltipArrow: "_tooltipArrow_bi4w5_23"
}, j = "/Users/mbp352/Workspaces/robotics-web-services-workspace/worktrees/web-ui-vocabulary-dissolution/ui-components/src/aui/ui/tooltip.tsx";
function Re({ delayDuration: e = 0, ...t }) {
	return /* @__PURE__ */ k(O.Provider, {
		"data-slot": "tooltip-provider",
		delayDuration: e,
		...t
	}, void 0, !1, {
		fileName: j,
		lineNumber: 15,
		columnNumber: 5
	}, this);
}
function ze({ ...e }) {
	return /* @__PURE__ */ k(O.Root, {
		"data-slot": "tooltip",
		...e
	}, void 0, !1, {
		fileName: j,
		lineNumber: 26,
		columnNumber: 10
	}, this);
}
function Be({ ...e }) {
	return /* @__PURE__ */ k(O.Trigger, {
		"data-slot": "tooltip-trigger",
		...e
	}, void 0, !1, {
		fileName: j,
		lineNumber: 32,
		columnNumber: 10
	}, this);
}
function Ve({ className: e, sideOffset: t = 0, children: n, ...r }) {
	return /* @__PURE__ */ k(O.Portal, { children: /* @__PURE__ */ k(O.Content, {
		"data-slot": "tooltip-content",
		sideOffset: t,
		className: A(Le.tooltipContent, e),
		...r,
		children: [n, /* @__PURE__ */ k(O.Arrow, { className: Le.tooltipArrow }, void 0, !1, {
			fileName: j,
			lineNumber: 50,
			columnNumber: 9
		}, this)]
	}, void 0, !0, {
		fileName: j,
		lineNumber: 43,
		columnNumber: 7
	}, this) }, void 0, !1, {
		fileName: j,
		lineNumber: 42,
		columnNumber: 5
	}, this);
}
var M = {
	button: "_button_1m8sv_23",
	variantDefault: "_variantDefault_1m8sv_127",
	variantDestructive: "_variantDestructive_1m8sv_80",
	variantOutline: "_variantOutline_1m8sv_31",
	variantSecondary: "_variantSecondary_1m8sv_238",
	variantGhost: "_variantGhost_1m8sv_246",
	variantLink: "_variantLink_1m8sv_254",
	sizeDefault: "_sizeDefault_1m8sv_266",
	sizeXs: "_sizeXs_1m8sv_115",
	sizeSm: "_sizeSm_1m8sv_291",
	sizeLg: "_sizeLg_1m8sv_300",
	sizeIcon: "_sizeIcon_1m8sv_115",
	sizeIconXs: "_sizeIconXs_1m8sv_115",
	sizeIconSm: "_sizeIconSm_1m8sv_323",
	sizeIconLg: "_sizeIconLg_1m8sv_328"
}, He = "/Users/mbp352/Workspaces/robotics-web-services-workspace/worktrees/web-ui-vocabulary-dissolution/ui-components/src/aui/ui/button.tsx", Ue = Me(M.button, {
	variants: {
		variant: {
			default: M.variantDefault,
			destructive: M.variantDestructive,
			outline: M.variantOutline,
			secondary: M.variantSecondary,
			ghost: M.variantGhost,
			link: M.variantLink
		},
		size: {
			default: M.sizeDefault,
			xs: M.sizeXs,
			sm: M.sizeSm,
			lg: M.sizeLg,
			icon: M.sizeIcon,
			"icon-xs": M.sizeIconXs,
			"icon-sm": M.sizeIconSm,
			"icon-lg": M.sizeIconLg
		}
	},
	defaultVariants: {
		variant: "default",
		size: "default"
	}
});
function N({ className: e, variant: t = "default", size: n = "default", asChild: r = !1, ...i }) {
	return /* @__PURE__ */ k(r ? Ae.Root : "button", {
		"data-slot": "button",
		"data-variant": t,
		"data-size": n,
		className: A(Ue({
			variant: t,
			size: n,
			className: e
		})),
		...i
	}, void 0, !1, {
		fileName: He,
		lineNumber: 49,
		columnNumber: 5
	}, this);
}
var P = {
	dialogOverlay: "_dialogOverlay_1qn1w_11",
	dialogContent: "_dialogContent_1qn1w_18",
	dialogClose: "_dialogClose_1qn1w_53",
	dialogHeader: "_dialogHeader_1qn1w_102",
	dialogFooter: "_dialogFooter_1qn1w_114",
	dialogTitle: "_dialogTitle_1qn1w_126",
	dialogDescription: "_dialogDescription_1qn1w_132",
	srOnly: "_srOnly_1qn1w_140"
}, F = "/Users/mbp352/Workspaces/robotics-web-services-workspace/worktrees/web-ui-vocabulary-dissolution/ui-components/src/aui/ui/dialog.tsx";
function We({ ...e }) {
	return /* @__PURE__ */ k(D.Root, {
		"data-slot": "dialog",
		...e
	}, void 0, !1, {
		fileName: F,
		lineNumber: 15,
		columnNumber: 10
	}, this);
}
function Ge({ ...e }) {
	return /* @__PURE__ */ k(D.Trigger, {
		"data-slot": "dialog-trigger",
		...e
	}, void 0, !1, {
		fileName: F,
		lineNumber: 21,
		columnNumber: 10
	}, this);
}
function Ke({ ...e }) {
	return /* @__PURE__ */ k(D.Portal, {
		"data-slot": "dialog-portal",
		...e
	}, void 0, !1, {
		fileName: F,
		lineNumber: 27,
		columnNumber: 10
	}, this);
}
function qe({ ...e }) {
	return /* @__PURE__ */ k(D.Close, {
		"data-slot": "dialog-close",
		...e
	}, void 0, !1, {
		fileName: F,
		lineNumber: 33,
		columnNumber: 10
	}, this);
}
function Je({ className: e, ...t }) {
	return /* @__PURE__ */ k(D.Overlay, {
		"data-slot": "dialog-overlay",
		className: A(P.dialogOverlay, e),
		...t
	}, void 0, !1, {
		fileName: F,
		lineNumber: 41,
		columnNumber: 5
	}, this);
}
function Ye({ className: e, children: t, showCloseButton: n = !0, ...r }) {
	return /* @__PURE__ */ k(Ke, {
		"data-slot": "dialog-portal",
		children: [/* @__PURE__ */ k(Je, {}, void 0, !1, {
			fileName: F,
			lineNumber: 59,
			columnNumber: 7
		}, this), /* @__PURE__ */ k(D.Content, {
			"data-slot": "dialog-content",
			className: A(P.dialogContent, e),
			...r,
			children: [t, n && /* @__PURE__ */ k(D.Close, {
				"data-slot": "dialog-close",
				className: P.dialogClose,
				children: [/* @__PURE__ */ k(ue, {}, void 0, !1, {
					fileName: F,
					lineNumber: 71,
					columnNumber: 13
				}, this), /* @__PURE__ */ k("span", {
					className: P.srOnly,
					children: "Close"
				}, void 0, !1, {
					fileName: F,
					lineNumber: 72,
					columnNumber: 13
				}, this)]
			}, void 0, !0, {
				fileName: F,
				lineNumber: 67,
				columnNumber: 11
			}, this)]
		}, void 0, !0, {
			fileName: F,
			lineNumber: 60,
			columnNumber: 7
		}, this)]
	}, void 0, !0, {
		fileName: F,
		lineNumber: 58,
		columnNumber: 5
	}, this);
}
function Xe({ className: e, ...t }) {
	return /* @__PURE__ */ k("div", {
		"data-slot": "dialog-header",
		className: A(P.dialogHeader, e),
		...t
	}, void 0, !1, {
		fileName: F,
		lineNumber: 82,
		columnNumber: 5
	}, this);
}
function Ze({ className: e, showCloseButton: t = !1, children: n, ...r }) {
	return /* @__PURE__ */ k("div", {
		"data-slot": "dialog-footer",
		className: A(P.dialogFooter, e),
		...r,
		children: [n, t && /* @__PURE__ */ k(D.Close, {
			asChild: !0,
			children: /* @__PURE__ */ k(N, {
				variant: "outline",
				children: "Close"
			}, void 0, !1, {
				fileName: F,
				lineNumber: 107,
				columnNumber: 11
			}, this)
		}, void 0, !1, {
			fileName: F,
			lineNumber: 106,
			columnNumber: 9
		}, this)]
	}, void 0, !0, {
		fileName: F,
		lineNumber: 99,
		columnNumber: 5
	}, this);
}
function Qe({ className: e, ...t }) {
	return /* @__PURE__ */ k(D.Title, {
		"data-slot": "dialog-title",
		className: A(P.dialogTitle, e),
		...t
	}, void 0, !1, {
		fileName: F,
		lineNumber: 119,
		columnNumber: 5
	}, this);
}
function $e({ className: e, ...t }) {
	return /* @__PURE__ */ k(D.Description, {
		"data-slot": "dialog-description",
		className: A(P.dialogDescription, e),
		...t
	}, void 0, !1, {
		fileName: F,
		lineNumber: 132,
		columnNumber: 5
	}, this);
}
var et = {
	avatarRoot: "_avatarRoot_tas3e_17",
	avatarImage: "_avatarImage_tas3e_37",
	avatarFallback: "_avatarFallback_tas3e_43",
	avatarBadge: "_avatarBadge_tas3e_60",
	avatarGroupRoot: "_avatarGroupRoot_tas3e_113",
	avatarGroupCount: "_avatarGroupCount_tas3e_132"
}, tt = "/Users/mbp352/Workspaces/robotics-web-services-workspace/worktrees/web-ui-vocabulary-dissolution/ui-components/src/aui/ui/avatar.tsx";
function nt({ className: e, size: t = "default", ...n }) {
	return /* @__PURE__ */ k(Oe.Root, {
		"data-slot": "avatar",
		"data-size": t,
		className: A(et.avatarRoot, e),
		...n
	}, void 0, !1, {
		fileName: tt,
		lineNumber: 18,
		columnNumber: 5
	}, this);
}
function rt({ className: e, ...t }) {
	return /* @__PURE__ */ k(Oe.Image, {
		"data-slot": "avatar-image",
		className: A(et.avatarImage, e),
		...t
	}, void 0, !1, {
		fileName: tt,
		lineNumber: 32,
		columnNumber: 5
	}, this);
}
function it({ className: e, ...t }) {
	return /* @__PURE__ */ k(Oe.Fallback, {
		"data-slot": "avatar-fallback",
		className: A(et.avatarFallback, e),
		...t
	}, void 0, !1, {
		fileName: tt,
		lineNumber: 45,
		columnNumber: 5
	}, this);
}
var at = {
	iconButton: "_iconButton_9rdbd_12",
	srOnly: "_srOnly_9rdbd_26"
}, I = "/Users/mbp352/Workspaces/robotics-web-services-workspace/worktrees/web-ui-vocabulary-dissolution/ui-components/src/aui/tooltip-icon-button.tsx", L = t(({ children: e, tooltip: t, side: n = "bottom", className: r, ...i }, a) => /* @__PURE__ */ k(Re, {
	delayDuration: 0,
	children: /* @__PURE__ */ k(ze, { children: [/* @__PURE__ */ k(Be, {
		asChild: !0,
		children: /* @__PURE__ */ k(N, {
			variant: "ghost",
			size: "icon",
			...i,
			className: A("aui-button-icon", at.iconButton, r),
			ref: a,
			children: [/* @__PURE__ */ k(Ae.Slottable, { children: e }, void 0, !1, {
				fileName: I,
				lineNumber: 41,
				columnNumber: 13
			}, void 0), /* @__PURE__ */ k("span", {
				className: A("aui-sr-only", at.srOnly),
				children: t
			}, void 0, !1, {
				fileName: I,
				lineNumber: 42,
				columnNumber: 13
			}, void 0)]
		}, void 0, !0, {
			fileName: I,
			lineNumber: 30,
			columnNumber: 11
		}, void 0)
	}, void 0, !1, {
		fileName: I,
		lineNumber: 29,
		columnNumber: 9
	}, void 0), /* @__PURE__ */ k(Ve, {
		side: n,
		children: t
	}, void 0, !1, {
		fileName: I,
		lineNumber: 45,
		columnNumber: 9
	}, void 0)] }, void 0, !0, {
		fileName: I,
		lineNumber: 28,
		columnNumber: 7
	}, void 0)
}, void 0, !1, {
	fileName: I,
	lineNumber: 27,
	columnNumber: 5
}, void 0));
L.displayName = "TooltipIconButton";
var R = {
	preview: "_preview_1b70w_2",
	invisibleWhileLoading: "_invisibleWhileLoading_1b70w_12",
	trigger: "_trigger_1b70w_19",
	dialogContent: "_dialogContent_1b70w_51",
	srOnly: "_srOnly_1b70w_103",
	previewWrapper: "_previewWrapper_1b70w_115",
	tileAvatar: "_tileAvatar_1b70w_131",
	tileImage: "_tileImage_1b70w_136",
	tileFallbackIcon: "_tileFallbackIcon_1b70w_140",
	root: "_root_1b70w_148",
	rootMessage: "_rootMessage_1b70w_158",
	tile: "_tile_1b70w_131",
	tileRemove: "_tileRemove_1b70w_192",
	removeIcon: "_removeIcon_1b70w_233",
	userMessageAttachmentsEnd: "_userMessageAttachmentsEnd_1b70w_249",
	composerAttachments: "_composerAttachments_1b70w_260",
	composerAddAttachment: "_composerAddAttachment_1b70w_275",
	addIcon: "_addIcon_1b70w_304"
}, z = "/Users/mbp352/Workspaces/robotics-web-services-workspace/worktrees/web-ui-vocabulary-dissolution/ui-components/src/aui/attachment.tsx", ot = (e) => {
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
}, st = () => {
	let { file: e, src: t } = E(De((e) => {
		if (e.attachment.type !== "image") return {};
		if (e.attachment.file) return { file: e.attachment.file };
		let t = e.attachment.content?.filter((e) => e.type === "image")[0]?.image;
		return t ? { src: t } : {};
	}));
	return ot(e) ?? t;
}, ct = ({ src: e }) => {
	let [t, n] = c(!1);
	return /* @__PURE__ */ k("img", {
		src: e,
		alt: "Attachment preview",
		className: A(R.preview, t ? "aui-attachment-preview-image-loaded" : A("aui-attachment-preview-image-loading", R.invisibleWhileLoading)),
		onLoad: () => n(!0)
	}, void 0, !1, {
		fileName: z,
		lineNumber: 71,
		columnNumber: 5
	}, void 0);
}, lt = ({ children: e }) => {
	let t = st();
	return t ? /* @__PURE__ */ k(We, { children: [/* @__PURE__ */ k(Ge, {
		className: A("aui-attachment-preview-trigger", R.trigger),
		asChild: !0,
		children: e
	}, void 0, !1, {
		fileName: z,
		lineNumber: 92,
		columnNumber: 7
	}, void 0), /* @__PURE__ */ k(Ye, {
		className: A("aui-attachment-preview-dialog-content", R.dialogContent),
		children: [/* @__PURE__ */ k(Qe, {
			className: A("aui-sr-only", R.srOnly),
			children: "Image Attachment Preview"
		}, void 0, !1, {
			fileName: z,
			lineNumber: 104,
			columnNumber: 9
		}, void 0), /* @__PURE__ */ k("div", {
			className: A("aui-attachment-preview", R.previewWrapper),
			children: /* @__PURE__ */ k(ct, { src: t }, void 0, !1, {
				fileName: z,
				lineNumber: 108,
				columnNumber: 11
			}, void 0)
		}, void 0, !1, {
			fileName: z,
			lineNumber: 107,
			columnNumber: 9
		}, void 0)]
	}, void 0, !0, {
		fileName: z,
		lineNumber: 98,
		columnNumber: 7
	}, void 0)] }, void 0, !0, {
		fileName: z,
		lineNumber: 91,
		columnNumber: 5
	}, void 0) : e;
}, ut = () => {
	let e = st();
	return /* @__PURE__ */ k(nt, {
		className: A("aui-attachment-tile-avatar", R.tileAvatar),
		children: [/* @__PURE__ */ k(rt, {
			src: e,
			alt: "Attachment preview",
			className: A("aui-attachment-tile-image", R.tileImage)
		}, void 0, !1, {
			fileName: z,
			lineNumber: 120,
			columnNumber: 7
		}, void 0), /* @__PURE__ */ k(it, { children: /* @__PURE__ */ k(y, { className: A("aui-attachment-tile-fallback-icon", R.tileFallbackIcon) }, void 0, !1, {
			fileName: z,
			lineNumber: 126,
			columnNumber: 9
		}, void 0) }, void 0, !1, {
			fileName: z,
			lineNumber: 125,
			columnNumber: 7
		}, void 0)]
	}, void 0, !0, {
		fileName: z,
		lineNumber: 119,
		columnNumber: 5
	}, void 0);
}, dt = () => {
	let e = be().attachment.source !== "message", t = E((e) => e.attachment.type === "image"), n = E((e) => {
		let t = e.attachment.type;
		switch (t) {
			case "image": return "Image";
			case "document": return "Document";
			case "file": return "File";
			default: return t;
		}
	});
	return /* @__PURE__ */ k(ze, { children: [/* @__PURE__ */ k(pe.Root, {
		className: A("aui-attachment-root", R.root, t && !e && A("aui-attachment-root-message", R.rootMessage)),
		children: [/* @__PURE__ */ k(lt, { children: /* @__PURE__ */ k(Be, {
			asChild: !0,
			children: /* @__PURE__ */ k("div", {
				className: A("aui-attachment-tile", R.tile),
				role: "button",
				tabIndex: 0,
				"aria-label": `${n} attachment`,
				children: /* @__PURE__ */ k(ut, {}, void 0, !1, {
					fileName: z,
					lineNumber: 175,
					columnNumber: 15
				}, void 0)
			}, void 0, !1, {
				fileName: z,
				lineNumber: 169,
				columnNumber: 13
			}, void 0)
		}, void 0, !1, {
			fileName: z,
			lineNumber: 168,
			columnNumber: 11
		}, void 0) }, void 0, !1, {
			fileName: z,
			lineNumber: 167,
			columnNumber: 9
		}, void 0), e && /* @__PURE__ */ k(ft, {}, void 0, !1, {
			fileName: z,
			lineNumber: 179,
			columnNumber: 24
		}, void 0)]
	}, void 0, !0, {
		fileName: z,
		lineNumber: 158,
		columnNumber: 7
	}, void 0), /* @__PURE__ */ k(Ve, {
		side: "top",
		children: /* @__PURE__ */ k(pe.Name, {}, void 0, !1, {
			fileName: z,
			lineNumber: 182,
			columnNumber: 9
		}, void 0)
	}, void 0, !1, {
		fileName: z,
		lineNumber: 181,
		columnNumber: 7
	}, void 0)] }, void 0, !0, {
		fileName: z,
		lineNumber: 157,
		columnNumber: 5
	}, void 0);
}, ft = () => /* @__PURE__ */ k(pe.Remove, {
	asChild: !0,
	children: /* @__PURE__ */ k(L, {
		tooltip: "Remove file",
		className: A("aui-attachment-tile-remove", R.tileRemove),
		side: "top",
		children: /* @__PURE__ */ k(ue, { className: A("aui-attachment-remove-icon", R.removeIcon) }, void 0, !1, {
			fileName: z,
			lineNumber: 196,
			columnNumber: 9
		}, void 0)
	}, void 0, !1, {
		fileName: z,
		lineNumber: 191,
		columnNumber: 7
	}, void 0)
}, void 0, !1, {
	fileName: z,
	lineNumber: 190,
	columnNumber: 5
}, void 0), pt = () => /* @__PURE__ */ k("div", {
	className: A("aui-user-message-attachments-end", R.userMessageAttachmentsEnd),
	children: /* @__PURE__ */ k(w.Attachments, { children: () => /* @__PURE__ */ k(dt, {}, void 0, !1, {
		fileName: z,
		lineNumber: 211,
		columnNumber: 16
	}, void 0) }, void 0, !1, {
		fileName: z,
		lineNumber: 210,
		columnNumber: 7
	}, void 0)
}, void 0, !1, {
	fileName: z,
	lineNumber: 204,
	columnNumber: 5
}, void 0), mt = () => /* @__PURE__ */ k("div", {
	className: A("aui-composer-attachments", R.composerAttachments),
	children: /* @__PURE__ */ k(C.Attachments, { children: () => /* @__PURE__ */ k(dt, {}, void 0, !1, {
		fileName: z,
		lineNumber: 221,
		columnNumber: 16
	}, void 0) }, void 0, !1, {
		fileName: z,
		lineNumber: 220,
		columnNumber: 7
	}, void 0)
}, void 0, !1, {
	fileName: z,
	lineNumber: 219,
	columnNumber: 5
}, void 0), ht = () => /* @__PURE__ */ k(C.AddAttachment, {
	asChild: !0,
	children: /* @__PURE__ */ k(L, {
		tooltip: "Add Attachment",
		side: "bottom",
		variant: "ghost",
		size: "icon",
		className: A("aui-composer-add-attachment", R.composerAddAttachment),
		"aria-label": "Add Attachment",
		children: /* @__PURE__ */ k(oe, { className: A("aui-attachment-add-icon", R.addIcon) }, void 0, !1, {
			fileName: z,
			lineNumber: 241,
			columnNumber: 9
		}, void 0)
	}, void 0, !1, {
		fileName: z,
		lineNumber: 230,
		columnNumber: 7
	}, void 0)
}, void 0, !1, {
	fileName: z,
	lineNumber: 229,
	columnNumber: 5
}, void 0), B = {
	codeHeaderRoot: "_codeHeaderRoot_4ahif_3",
	codeHeaderLanguage: "_codeHeaderLanguage_4ahif_24",
	h1: "_h1_4ahif_39",
	h2: "_h2_4ahif_54",
	h3: "_h3_4ahif_69",
	h4: "_h4_4ahif_84",
	h5: "_h5_4ahif_99",
	h6: "_h6_4ahif_113",
	p: "_p_4ahif_127",
	a: "_a_4ahif_138",
	blockquote: "_blockquote_4ahif_150",
	ul: "_ul_4ahif_160",
	ol: "_ol_4ahif_175",
	hr: "_hr_4ahif_190",
	table: "_table_4ahif_196",
	th: "_th_4ahif_204",
	td: "_td_4ahif_224",
	tr: "_tr_4ahif_246",
	li: "_li_4ahif_263",
	strong: "_strong_4ahif_267",
	sup: "_sup_4ahif_271",
	pre: "_pre_4ahif_277",
	inlineCode: "_inlineCode_4ahif_298"
}, V = "/Users/mbp352/Workspaces/robotics-web-services-workspace/worktrees/web-ui-vocabulary-dissolution/ui-components/src/aui/markdown-text.tsx", gt = n(() => /* @__PURE__ */ k(Ne, {
	remarkPlugins: [Ie],
	className: "aui-md",
	components: yt,
	defer: !0
}, void 0, !1, {
	fileName: V,
	lineNumber: 37,
	columnNumber: 5
}, void 0)), _t = ({ language: e, code: t }) => {
	let { isCopied: n, copyToClipboard: r } = vt();
	return /* @__PURE__ */ k("div", {
		className: A("aui-code-header-root", B.codeHeaderRoot),
		children: [/* @__PURE__ */ k("span", {
			className: A("aui-code-header-language", B.codeHeaderLanguage),
			children: e
		}, void 0, !1, {
			fileName: V,
			lineNumber: 57,
			columnNumber: 7
		}, void 0), /* @__PURE__ */ k(L, {
			tooltip: "Copy",
			onClick: () => {
				!t || n || r(t);
			},
			children: [!n && /* @__PURE__ */ k(_, {}, void 0, !1, {
				fileName: V,
				lineNumber: 61,
				columnNumber: 23
			}, void 0), n && /* @__PURE__ */ k(p, {}, void 0, !1, {
				fileName: V,
				lineNumber: 62,
				columnNumber: 22
			}, void 0)]
		}, void 0, !0, {
			fileName: V,
			lineNumber: 60,
			columnNumber: 7
		}, void 0)]
	}, void 0, !0, {
		fileName: V,
		lineNumber: 56,
		columnNumber: 5
	}, void 0);
}, vt = ({ copiedDuration: e = 3e3 } = {}) => {
	let [t, n] = c(!1);
	return {
		isCopied: t,
		copyToClipboard: (t) => {
			!t || typeof navigator > "u" || !navigator.clipboard || navigator.clipboard.writeText(t).then(() => {
				n(!0), setTimeout(() => n(!1), e);
			}, () => {});
		}
	};
}, yt = Pe({
	h1: ({ className: e, ...t }) => /* @__PURE__ */ k("h1", {
		className: A("aui-md-h1", B.h1, e),
		...t
	}, void 0, !1, {
		fileName: V,
		lineNumber: 94,
		columnNumber: 5
	}, void 0),
	h2: ({ className: e, ...t }) => /* @__PURE__ */ k("h2", {
		className: A("aui-md-h2", B.h2, e),
		...t
	}, void 0, !1, {
		fileName: V,
		lineNumber: 97,
		columnNumber: 5
	}, void 0),
	h3: ({ className: e, ...t }) => /* @__PURE__ */ k("h3", {
		className: A("aui-md-h3", B.h3, e),
		...t
	}, void 0, !1, {
		fileName: V,
		lineNumber: 100,
		columnNumber: 5
	}, void 0),
	h4: ({ className: e, ...t }) => /* @__PURE__ */ k("h4", {
		className: A("aui-md-h4", B.h4, e),
		...t
	}, void 0, !1, {
		fileName: V,
		lineNumber: 103,
		columnNumber: 5
	}, void 0),
	h5: ({ className: e, ...t }) => /* @__PURE__ */ k("h5", {
		className: A("aui-md-h5", B.h5, e),
		...t
	}, void 0, !1, {
		fileName: V,
		lineNumber: 106,
		columnNumber: 5
	}, void 0),
	h6: ({ className: e, ...t }) => /* @__PURE__ */ k("h6", {
		className: A("aui-md-h6", B.h6, e),
		...t
	}, void 0, !1, {
		fileName: V,
		lineNumber: 109,
		columnNumber: 5
	}, void 0),
	p: ({ className: e, ...t }) => /* @__PURE__ */ k("p", {
		className: A("aui-md-p", B.p, e),
		...t
	}, void 0, !1, {
		fileName: V,
		lineNumber: 112,
		columnNumber: 5
	}, void 0),
	a: ({ className: e, ...t }) => /* @__PURE__ */ k("a", {
		className: A("aui-md-a", B.a, e),
		...t
	}, void 0, !1, {
		fileName: V,
		lineNumber: 115,
		columnNumber: 5
	}, void 0),
	blockquote: ({ className: e, ...t }) => /* @__PURE__ */ k("blockquote", {
		className: A("aui-md-blockquote", B.blockquote, e),
		...t
	}, void 0, !1, {
		fileName: V,
		lineNumber: 118,
		columnNumber: 5
	}, void 0),
	ul: ({ className: e, ...t }) => /* @__PURE__ */ k("ul", {
		className: A("aui-md-ul", B.ul, e),
		...t
	}, void 0, !1, {
		fileName: V,
		lineNumber: 124,
		columnNumber: 5
	}, void 0),
	ol: ({ className: e, ...t }) => /* @__PURE__ */ k("ol", {
		className: A("aui-md-ol", B.ol, e),
		...t
	}, void 0, !1, {
		fileName: V,
		lineNumber: 127,
		columnNumber: 5
	}, void 0),
	hr: ({ className: e, ...t }) => /* @__PURE__ */ k("hr", {
		className: A("aui-md-hr", B.hr, e),
		...t
	}, void 0, !1, {
		fileName: V,
		lineNumber: 130,
		columnNumber: 5
	}, void 0),
	table: ({ className: e, ...t }) => /* @__PURE__ */ k("table", {
		className: A("aui-md-table", B.table, e),
		...t
	}, void 0, !1, {
		fileName: V,
		lineNumber: 133,
		columnNumber: 5
	}, void 0),
	th: ({ className: e, ...t }) => /* @__PURE__ */ k("th", {
		className: A("aui-md-th", B.th, e),
		...t
	}, void 0, !1, {
		fileName: V,
		lineNumber: 139,
		columnNumber: 5
	}, void 0),
	td: ({ className: e, ...t }) => /* @__PURE__ */ k("td", {
		className: A("aui-md-td", B.td, e),
		...t
	}, void 0, !1, {
		fileName: V,
		lineNumber: 142,
		columnNumber: 5
	}, void 0),
	tr: ({ className: e, ...t }) => /* @__PURE__ */ k("tr", {
		className: A("aui-md-tr", B.tr, e),
		...t
	}, void 0, !1, {
		fileName: V,
		lineNumber: 145,
		columnNumber: 5
	}, void 0),
	li: ({ className: e, ...t }) => /* @__PURE__ */ k("li", {
		className: A("aui-md-li", B.li, e),
		...t
	}, void 0, !1, {
		fileName: V,
		lineNumber: 148,
		columnNumber: 5
	}, void 0),
	strong: ({ className: e, ...t }) => /* @__PURE__ */ k("strong", {
		className: A("aui-md-strong", B.strong, e),
		...t
	}, void 0, !1, {
		fileName: V,
		lineNumber: 151,
		columnNumber: 5
	}, void 0),
	sup: ({ className: e, ...t }) => /* @__PURE__ */ k("sup", {
		className: A("aui-md-sup", B.sup, e),
		...t
	}, void 0, !1, {
		fileName: V,
		lineNumber: 157,
		columnNumber: 5
	}, void 0),
	pre: ({ className: e, ...t }) => /* @__PURE__ */ k("pre", {
		className: A("aui-md-pre", B.pre, e),
		...t
	}, void 0, !1, {
		fileName: V,
		lineNumber: 160,
		columnNumber: 5
	}, void 0),
	code: function({ className: e, ...t }) {
		return /* @__PURE__ */ k("code", {
			className: A(!Fe() && A("aui-md-inline-code", B.inlineCode), e),
			...t
		}, void 0, !1, {
			fileName: V,
			lineNumber: 165,
			columnNumber: 7
		}, this);
	},
	CodeHeader: _t
}), bt = "/Users/mbp352/Workspaces/robotics-web-services-workspace/worktrees/web-ui-vocabulary-dissolution/ui-components/src/aui/ui/collapsible.tsx";
function xt({ ...e }) {
	return /* @__PURE__ */ k(ke.Root, {
		"data-slot": "collapsible",
		...e
	}, void 0, !1, {
		fileName: bt,
		lineNumber: 8,
		columnNumber: 10
	}, this);
}
function St({ ...e }) {
	return /* @__PURE__ */ k(ke.CollapsibleTrigger, {
		"data-slot": "collapsible-trigger",
		...e
	}, void 0, !1, {
		fileName: bt,
		lineNumber: 15,
		columnNumber: 5
	}, this);
}
function Ct({ ...e }) {
	return /* @__PURE__ */ k(ke.CollapsibleContent, {
		"data-slot": "collapsible-content",
		...e
	}, void 0, !1, {
		fileName: bt,
		lineNumber: 26,
		columnNumber: 5
	}, this);
}
var H = {
	root: "_root_1gf0n_32",
	rootOutline: "_rootOutline_1gf0n_38",
	rootMuted: "_rootMuted_1gf0n_46",
	trigger: "_trigger_1gf0n_7",
	triggerIcon: "_triggerIcon_1gf0n_79",
	labelWrapper: "_labelWrapper_1gf0n_85",
	shimmer: "_shimmer_1gf0n_8",
	chevron: "_chevron_1gf0n_8",
	content: "_content_1gf0n_8",
	fadeTop: "_fadeTop_1gf0n_135",
	fadeBottom: "_fadeBottom_1gf0n_136",
	text: "_text_1gf0n_173",
	textContent: "_textContent_1gf0n_194"
}, U = "/Users/mbp352/Workspaces/robotics-web-services-workspace/worktrees/web-ui-vocabulary-dissolution/ui-components/src/aui/reasoning.tsx", wt = 200, Tt = e(!1), Et = Me(H.root, {
	variants: { variant: {
		outline: H.rootOutline,
		ghost: "",
		muted: H.rootMuted
	} },
	defaultVariants: { variant: "outline" }
});
function Dt({ className: e, variant: t, open: n, onOpenChange: i, defaultOpen: a = !1, streaming: l, children: u, ...d }) {
	let f = s(null), p = s(a), [m, h] = c(null), g = Se(f, wt), _ = n !== void 0, v = _ ? n : m ?? l ?? p.current, y = l === !0 && v && (_ || m === null), b = s(l);
	return o(() => {
		b.current !== l && (b.current = l, !_ && m === null && g());
	}, [
		l,
		_,
		m,
		g
	]), /* @__PURE__ */ k(xt, {
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
		className: A("aui-reasoning-root", Et({
			variant: t,
			className: e
		})),
		style: { "--animation-duration": `${wt}ms` },
		...d,
		children: /* @__PURE__ */ k(Tt.Provider, {
			value: y,
			children: u
		}, void 0, !1, {
			fileName: U,
			lineNumber: 119,
			columnNumber: 7
		}, this)
	}, void 0, !1, {
		fileName: U,
		lineNumber: 105,
		columnNumber: 5
	}, this);
}
function Ot({ side: e = "bottom", className: t, ...n }) {
	return /* @__PURE__ */ k("div", {
		"data-slot": "reasoning-fade",
		className: A("aui-reasoning-fade", e === "top" ? H.fadeTop : H.fadeBottom, t),
		...n
	}, void 0, !1, {
		fileName: U,
		lineNumber: 132,
		columnNumber: 5
	}, this);
}
function kt({ active: e, duration: t, className: n, ...r }) {
	let i = t ? ` (${t}s)` : "";
	return /* @__PURE__ */ k(St, {
		"data-slot": "reasoning-trigger",
		className: A("aui-reasoning-trigger", H.trigger, n),
		...r,
		children: [
			/* @__PURE__ */ k(f, {
				"data-slot": "reasoning-trigger-icon",
				className: A("aui-reasoning-trigger-icon", H.triggerIcon)
			}, void 0, !1, {
				fileName: U,
				lineNumber: 161,
				columnNumber: 7
			}, this),
			/* @__PURE__ */ k("span", {
				"data-slot": "reasoning-trigger-label",
				className: A("aui-reasoning-trigger-label-wrapper", H.labelWrapper),
				children: [/* @__PURE__ */ k("span", { children: ["Reasoning", i] }, void 0, !0, {
					fileName: U,
					lineNumber: 172,
					columnNumber: 9
				}, this), e ? /* @__PURE__ */ k("span", {
					"aria-hidden": !0,
					"data-slot": "reasoning-trigger-shimmer",
					className: A("aui-reasoning-trigger-shimmer", H.shimmer),
					children: ["Reasoning", i]
				}, void 0, !0, {
					fileName: U,
					lineNumber: 174,
					columnNumber: 11
				}, this) : null]
			}, void 0, !0, {
				fileName: U,
				lineNumber: 165,
				columnNumber: 7
			}, this),
			/* @__PURE__ */ k(m, {
				"data-slot": "reasoning-trigger-chevron",
				className: A("aui-reasoning-trigger-chevron", H.chevron)
			}, void 0, !1, {
				fileName: U,
				lineNumber: 183,
				columnNumber: 7
			}, this)
		]
	}, void 0, !0, {
		fileName: U,
		lineNumber: 156,
		columnNumber: 5
	}, this);
}
function At({ className: e, children: t, ...n }) {
	let r = i(Tt);
	return /* @__PURE__ */ k(Ct, {
		"data-slot": "reasoning-content",
		className: A("aui-reasoning-content", H.content, e),
		...n,
		children: [
			r ? /* @__PURE__ */ k(Ot, { side: "top" }, void 0, !1, {
				fileName: U,
				lineNumber: 204,
				columnNumber: 20
			}, this) : null,
			t,
			/* @__PURE__ */ k(Ot, {}, void 0, !1, {
				fileName: U,
				lineNumber: 206,
				columnNumber: 7
			}, this)
		]
	}, void 0, !0, {
		fileName: U,
		lineNumber: 199,
		columnNumber: 5
	}, this);
}
function jt({ className: e, children: t, ...n }) {
	let r = i(Tt), o = s(null), c = s(null);
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
	}, [r]), /* @__PURE__ */ k("div", {
		ref: o,
		"data-slot": "reasoning-text",
		className: A("aui-reasoning-text", H.text, e),
		...n,
		children: /* @__PURE__ */ k("div", {
			ref: c,
			className: A("aui-reasoning-text-content", H.textContent),
			children: t
		}, void 0, !1, {
			fileName: U,
			lineNumber: 241,
			columnNumber: 7
		}, this)
	}, void 0, !1, {
		fileName: U,
		lineNumber: 235,
		columnNumber: 5
	}, this);
}
var Mt = () => /* @__PURE__ */ k(gt, {}, void 0, !1, {
	fileName: U,
	lineNumber: 251,
	columnNumber: 60
}, void 0), Nt = ({ children: e, startIndex: t, endIndex: n }) => {
	let r = E((e) => {
		if (e.message.status?.type !== "running") return !1;
		let r = e.message.parts.length - 1;
		return r < 0 || e.message.parts[r]?.type !== "reasoning" ? !1 : r >= t && r <= n;
	});
	return /* @__PURE__ */ k(Dt, {
		streaming: r,
		children: [/* @__PURE__ */ k(kt, { active: r }, void 0, !1, {
			fileName: U,
			lineNumber: 269,
			columnNumber: 7
		}, void 0), /* @__PURE__ */ k(At, {
			"aria-busy": r,
			children: /* @__PURE__ */ k(jt, { children: e }, void 0, !1, {
				fileName: U,
				lineNumber: 271,
				columnNumber: 9
			}, void 0)
		}, void 0, !1, {
			fileName: U,
			lineNumber: 270,
			columnNumber: 7
		}, void 0)]
	}, void 0, !0, {
		fileName: U,
		lineNumber: 268,
		columnNumber: 5
	}, void 0);
}, W = n(Mt);
W.displayName = "Reasoning", W.Root = Dt, W.Trigger = kt, W.Content = At, W.Text = jt, W.Fade = Ot;
var Pt = n(Nt);
Pt.displayName = "ReasoningGroup";
var G = {
	root: "_root_r7otq_21",
	trigger: "_trigger_r7otq_25",
	triggerIcon: "_triggerIcon_r7otq_51",
	triggerIconCancelled: "_triggerIconCancelled_r7otq_57",
	triggerIconRunning: "_triggerIconRunning_r7otq_61",
	duration: "_duration_r7otq_68",
	labelWrapper: "_labelWrapper_r7otq_75",
	labelWrapperCancelled: "_labelWrapperCancelled_r7otq_82",
	shimmer: "_shimmer_r7otq_89",
	chevron: "_chevron_r7otq_95",
	content: "_content_r7otq_109",
	contentInner: "_contentInner_r7otq_123",
	argsCancelled: "_argsCancelled_r7otq_132",
	argsValue: "_argsValue_r7otq_136",
	resultHeader: "_resultHeader_r7otq_146",
	resultContent: "_resultContent_r7otq_153",
	errorHeader: "_errorHeader_r7otq_164",
	errorReason: "_errorReason_r7otq_169",
	approval: "_approval_r7otq_173",
	approvalWrap: "_approvalWrap_r7otq_182",
	approvalConfirm: "_approvalConfirm_r7otq_186",
	approvalConfirmTitle: "_approvalConfirmTitle_r7otq_193",
	approvalConfirmDescription: "_approvalConfirmDescription_r7otq_197",
	approvalConfirmGrants: "_approvalConfirmGrants_r7otq_201",
	approvalConfirmGrant: "_approvalConfirmGrant_r7otq_201",
	approvalConfirmActions: "_approvalConfirmActions_r7otq_216"
}, K = "/Users/mbp352/Workspaces/robotics-web-services-workspace/worktrees/web-ui-vocabulary-dissolution/ui-components/src/aui/tool-fallback.tsx", Ft = 200;
function It({ className: e, open: t, onOpenChange: n, defaultOpen: i = !1, children: a, ...o }) {
	let l = s(null), [u, d] = c(i), f = Se(l, Ft), p = t !== void 0;
	return /* @__PURE__ */ k(xt, {
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
		className: A("aui-tool-fallback-root", G.root, e),
		style: { "--animation-duration": `${Ft}ms` },
		...o,
		children: a
	}, void 0, !1, {
		fileName: K,
		lineNumber: 67,
		columnNumber: 5
	}, this);
}
var Lt = {
	running: b,
	complete: p,
	incomplete: le,
	"requires-action": l
}, Rt = (e) => {
	if (e < 1e3) return "<1s";
	let t = e / 1e3;
	return t < 10 ? `${(Math.floor(t * 10) / 10).toFixed(1)}s` : t < 60 ? `${Math.floor(t)}s` : `${Math.floor(t / 60)}m ${Math.floor(t % 60)}s`;
};
function zt({ className: e, ...t }) {
	let n = Ce();
	return n === void 0 ? null : /* @__PURE__ */ k("span", {
		"data-slot": "tool-fallback-duration",
		className: A("aui-tool-fallback-duration", G.duration, e),
		...t,
		children: Rt(n)
	}, void 0, !1, {
		fileName: K,
		lineNumber: 110,
		columnNumber: 5
	}, this);
}
function Bt({ toolName: e, status: t, className: n, ...r }) {
	let i = t?.type ?? "complete", a = i === "running", o = t?.type === "incomplete" && t.reason === "cancelled", s = Lt[i], c = o ? "Cancelled tool" : "Used tool";
	return /* @__PURE__ */ k(St, {
		"data-slot": "tool-fallback-trigger",
		className: A("aui-tool-fallback-trigger", G.trigger, n),
		...r,
		children: [
			/* @__PURE__ */ k(s, {
				"data-slot": "tool-fallback-trigger-icon",
				className: A("aui-tool-fallback-trigger-icon", G.triggerIcon, o && G.triggerIconCancelled, a && G.triggerIconRunning)
			}, void 0, !1, {
				fileName: K,
				lineNumber: 143,
				columnNumber: 7
			}, this),
			/* @__PURE__ */ k("span", {
				"data-slot": "tool-fallback-trigger-label",
				className: A("aui-tool-fallback-trigger-label-wrapper", G.labelWrapper, o && G.labelWrapperCancelled),
				children: [/* @__PURE__ */ k("span", { children: [
					c,
					": ",
					/* @__PURE__ */ k("b", { children: e }, void 0, !1, {
						fileName: K,
						lineNumber: 161,
						columnNumber: 20
					}, this)
				] }, void 0, !0, {
					fileName: K,
					lineNumber: 160,
					columnNumber: 9
				}, this), a && /* @__PURE__ */ k("span", {
					"aria-hidden": !0,
					"data-slot": "tool-fallback-trigger-shimmer",
					className: A("aui-tool-fallback-trigger-shimmer", G.shimmer),
					children: [
						c,
						": ",
						/* @__PURE__ */ k("b", { children: e }, void 0, !1, {
							fileName: K,
							lineNumber: 169,
							columnNumber: 22
						}, this)
					]
				}, void 0, !0, {
					fileName: K,
					lineNumber: 164,
					columnNumber: 11
				}, this)]
			}, void 0, !0, {
				fileName: K,
				lineNumber: 152,
				columnNumber: 7
			}, this),
			/* @__PURE__ */ k(zt, {}, void 0, !1, {
				fileName: K,
				lineNumber: 173,
				columnNumber: 7
			}, this),
			/* @__PURE__ */ k(m, {
				"data-slot": "tool-fallback-trigger-chevron",
				className: A("aui-tool-fallback-trigger-chevron", G.chevron)
			}, void 0, !1, {
				fileName: K,
				lineNumber: 174,
				columnNumber: 7
			}, this)
		]
	}, void 0, !0, {
		fileName: K,
		lineNumber: 138,
		columnNumber: 5
	}, this);
}
function Vt({ className: e, children: t, ...n }) {
	return /* @__PURE__ */ k(Ct, {
		"data-slot": "tool-fallback-content",
		className: A("aui-tool-fallback-content", G.content, e),
		...n,
		children: /* @__PURE__ */ k("div", {
			className: G.contentInner,
			children: t
		}, void 0, !1, {
			fileName: K,
			lineNumber: 193,
			columnNumber: 7
		}, this)
	}, void 0, !1, {
		fileName: K,
		lineNumber: 188,
		columnNumber: 5
	}, this);
}
function Ht({ argsText: e, className: t, ...n }) {
	return e ? /* @__PURE__ */ k("div", {
		"data-slot": "tool-fallback-args",
		className: A("aui-tool-fallback-args", t),
		...n,
		children: /* @__PURE__ */ k("pre", {
			className: A("aui-tool-fallback-args-value", G.argsValue),
			children: e
		}, void 0, !1, {
			fileName: K,
			lineNumber: 213,
			columnNumber: 7
		}, this)
	}, void 0, !1, {
		fileName: K,
		lineNumber: 208,
		columnNumber: 5
	}, this) : null;
}
function Ut({ result: e, className: t, ...n }) {
	return e === void 0 ? null : /* @__PURE__ */ k("div", {
		"data-slot": "tool-fallback-result",
		className: A("aui-tool-fallback-result", t),
		...n,
		children: [/* @__PURE__ */ k("p", {
			className: A("aui-tool-fallback-result-header", G.resultHeader),
			children: "Result:"
		}, void 0, !1, {
			fileName: K,
			lineNumber: 235,
			columnNumber: 7
		}, this), /* @__PURE__ */ k("pre", {
			className: A("aui-tool-fallback-result-content", G.resultContent),
			children: typeof e == "string" ? e : JSON.stringify(e, null, 2)
		}, void 0, !1, {
			fileName: K,
			lineNumber: 238,
			columnNumber: 7
		}, this)]
	}, void 0, !0, {
		fileName: K,
		lineNumber: 230,
		columnNumber: 5
	}, this);
}
function Wt({ status: e, className: t, ...n }) {
	if (e?.type !== "incomplete") return null;
	let r = e.error, i = r ? typeof r == "string" ? r : JSON.stringify(r) : null;
	if (!i) return null;
	let a = e.reason === "cancelled" ? "Cancelled reason:" : "Error:";
	return /* @__PURE__ */ k("div", {
		"data-slot": "tool-fallback-error",
		className: A("aui-tool-fallback-error", t),
		...n,
		children: [/* @__PURE__ */ k("p", {
			className: A("aui-tool-fallback-error-header", G.errorHeader),
			children: a
		}, void 0, !1, {
			fileName: K,
			lineNumber: 277,
			columnNumber: 7
		}, this), /* @__PURE__ */ k("p", {
			className: A("aui-tool-fallback-error-reason", G.errorReason),
			children: i
		}, void 0, !1, {
			fileName: K,
			lineNumber: 280,
			columnNumber: 7
		}, this)]
	}, void 0, !0, {
		fileName: K,
		lineNumber: 272,
		columnNumber: 5
	}, this);
}
var Gt = "Approved by user", Kt = "User denied tool execution", qt = {
	"allow-once": "Allow",
	"allow-always": "Always allow",
	"reject-once": "Deny",
	"reject-always": "Always deny"
}, Jt = (e) => e === "allow-once" || e === "allow-always", Yt = (e) => e.label ?? (Object.hasOwn(qt, e.kind) ? qt[e.kind] : void 0) ?? e.id;
function Xt({ className: e, addResult: t, resume: n, interrupt: r, approval: i, respondToApproval: a, ...o }) {
	let [s, l] = c(!1), [u, d] = c(null);
	if (i != null && (i.approved !== void 0 || i.resolution !== void 0)) return null;
	let f = a ? i?.options : void 0, p = f?.filter((e) => Object.hasOwn(qt, e.kind)), m = (e) => {
		s || (i != null && i.approved === void 0 && a ? a({ approved: e }) : r ? n?.({ approved: e }) : t?.(e ? Gt : Kt), l(!0));
	}, h = (e) => {
		s || (a?.({ optionId: e.id }), l(!0), d(null));
	}, g = (e) => {
		e.confirm ? d(e.id) : h(e);
	}, _ = u == null ? void 0 : p?.find((e) => e.id === u);
	if (_) {
		let t = typeof _.confirm == "object" ? _.confirm : void 0, n = t?.description ?? _.description;
		return /* @__PURE__ */ k("div", {
			"data-slot": "tool-fallback-approval-confirm",
			className: A("aui-tool-fallback-approval-confirm", G.approvalConfirm, e),
			...o,
			children: [
				/* @__PURE__ */ k("p", {
					className: A("aui-tool-fallback-approval-confirm-title", G.approvalConfirmTitle),
					children: t?.title ?? `${Yt(_)}?`
				}, void 0, !1, {
					fileName: K,
					lineNumber: 391,
					columnNumber: 9
				}, this),
				n && /* @__PURE__ */ k("p", {
					className: A("aui-tool-fallback-approval-confirm-description", G.approvalConfirmDescription),
					children: n
				}, void 0, !1, {
					fileName: K,
					lineNumber: 400,
					columnNumber: 11
				}, this),
				_.grants && _.grants.length > 0 && /* @__PURE__ */ k("ul", {
					className: A("aui-tool-fallback-approval-confirm-grants", G.approvalConfirmGrants),
					children: _.grants.map((e) => /* @__PURE__ */ k("li", { children: /* @__PURE__ */ k("code", {
						className: A("aui-tool-fallback-approval-confirm-grant", G.approvalConfirmGrant),
						children: e
					}, void 0, !1, {
						fileName: K,
						lineNumber: 418,
						columnNumber: 17
					}, this) }, e, !1, {
						fileName: K,
						lineNumber: 417,
						columnNumber: 15
					}, this))
				}, void 0, !1, {
					fileName: K,
					lineNumber: 410,
					columnNumber: 11
				}, this),
				/* @__PURE__ */ k("div", {
					className: G.approvalConfirmActions,
					children: [/* @__PURE__ */ k(N, {
						size: "sm",
						onClick: () => h(_),
						disabled: s,
						children: "Confirm"
					}, void 0, !1, {
						fileName: K,
						lineNumber: 431,
						columnNumber: 11
					}, this), /* @__PURE__ */ k(N, {
						size: "sm",
						variant: "outline",
						onClick: () => d(null),
						disabled: s,
						children: "Back"
					}, void 0, !1, {
						fileName: K,
						lineNumber: 438,
						columnNumber: 11
					}, this)]
				}, void 0, !0, {
					fileName: K,
					lineNumber: 430,
					columnNumber: 9
				}, this)
			]
		}, void 0, !0, {
			fileName: K,
			lineNumber: 382,
			columnNumber: 7
		}, this);
	}
	if (f && f.length > 0) {
		let t = p?.filter((e) => Jt(e.kind)) ?? [], n = p?.filter((e) => !Jt(e.kind)) ?? [];
		return /* @__PURE__ */ k("div", {
			"data-slot": "tool-fallback-approval",
			className: A("aui-tool-fallback-approval", G.approval, G.approvalWrap, e),
			...o,
			children: [[...t, ...n].map((e) => /* @__PURE__ */ k(N, {
				size: "sm",
				variant: e === t[0] ? "default" : "outline",
				onClick: () => g(e),
				disabled: s,
				children: Yt(e)
			}, e.id, !1, {
				fileName: K,
				lineNumber: 466,
				columnNumber: 11
			}, this)), n.length === 0 && /* @__PURE__ */ k(N, {
				size: "sm",
				variant: "outline",
				onClick: () => m(!1),
				disabled: s,
				children: "Deny"
			}, void 0, !1, {
				fileName: K,
				lineNumber: 477,
				columnNumber: 11
			}, this)]
		}, void 0, !0, {
			fileName: K,
			lineNumber: 455,
			columnNumber: 7
		}, this);
	}
	return /* @__PURE__ */ k("div", {
		"data-slot": "tool-fallback-approval",
		className: A("aui-tool-fallback-approval", G.approval, e),
		...o,
		children: [/* @__PURE__ */ k(N, {
			size: "sm",
			onClick: () => m(!0),
			disabled: s,
			children: "Allow"
		}, void 0, !1, {
			fileName: K,
			lineNumber: 496,
			columnNumber: 7
		}, this), /* @__PURE__ */ k(N, {
			size: "sm",
			variant: "outline",
			onClick: () => m(!1),
			disabled: s,
			children: "Deny"
		}, void 0, !1, {
			fileName: K,
			lineNumber: 499,
			columnNumber: 7
		}, this)]
	}, void 0, !0, {
		fileName: K,
		lineNumber: 491,
		columnNumber: 5
	}, this);
}
var q = n(({ toolName: e, argsText: t, result: n, status: r, addResult: i, resume: a, interrupt: o, approval: s, respondToApproval: l }) => {
	let u = r?.type === "incomplete" && r.reason === "cancelled", d = r?.type === "requires-action", [f, p] = c(d), [m, h] = c(d);
	return d !== m && (h(d), d && p(!0)), /* @__PURE__ */ k(It, {
		open: f,
		onOpenChange: p,
		children: [/* @__PURE__ */ k(Bt, {
			toolName: e,
			status: r
		}, void 0, !1, {
			fileName: K,
			lineNumber: 536,
			columnNumber: 7
		}, void 0), /* @__PURE__ */ k(Vt, { children: [
			/* @__PURE__ */ k(Wt, { status: r }, void 0, !1, {
				fileName: K,
				lineNumber: 538,
				columnNumber: 9
			}, void 0),
			/* @__PURE__ */ k(Ht, {
				argsText: t,
				className: A(u && G.argsCancelled)
			}, void 0, !1, {
				fileName: K,
				lineNumber: 539,
				columnNumber: 9
			}, void 0),
			d && /* @__PURE__ */ k(Xt, {
				addResult: i,
				resume: a,
				interrupt: o,
				approval: s,
				respondToApproval: l
			}, void 0, !1, {
				fileName: K,
				lineNumber: 544,
				columnNumber: 11
			}, void 0),
			!u && /* @__PURE__ */ k(Ut, { result: n }, void 0, !1, {
				fileName: K,
				lineNumber: 552,
				columnNumber: 26
			}, void 0)
		] }, void 0, !0, {
			fileName: K,
			lineNumber: 537,
			columnNumber: 7
		}, void 0)]
	}, void 0, !0, {
		fileName: K,
		lineNumber: 535,
		columnNumber: 5
	}, void 0);
});
q.displayName = "ToolFallback", q.Root = It, q.Trigger = Bt, q.Content = Vt, q.Args = Ht, q.Result = Ut, q.Error = Wt, q.Approval = Xt;
var J = {
	root: "_root_kpwo4_13",
	rootOutline: "_rootOutline_kpwo4_21",
	rootMuted: "_rootMuted_kpwo4_28",
	trigger: "_trigger_kpwo4_37",
	triggerLoader: "_triggerLoader_kpwo4_71",
	labelWrapper: "_labelWrapper_kpwo4_81",
	shimmer: "_shimmer_kpwo4_100",
	chevron: "_chevron_kpwo4_106",
	content: "_content_kpwo4_120",
	contentInner: "_contentInner_kpwo4_134"
}, Y = "/Users/mbp352/Workspaces/robotics-web-services-workspace/worktrees/web-ui-vocabulary-dissolution/ui-components/src/aui/tool-group.tsx", Zt = 200, Qt = Me(J.root, {
	variants: { variant: {
		outline: J.rootOutline,
		ghost: "",
		muted: J.rootMuted
	} },
	defaultVariants: { variant: "outline" }
});
function $t({ className: e, variant: t, open: n, onOpenChange: i, defaultOpen: a = !1, children: o, ...l }) {
	let u = s(null), [d, f] = c(a), p = Se(u, Zt), m = n !== void 0, h = m ? n : d, g = r((e) => {
		p(), m || f(e), i?.(e);
	}, [
		p,
		m,
		i
	]);
	return /* @__PURE__ */ k(xt, {
		ref: u,
		"data-slot": "tool-group-root",
		"data-variant": t ?? "outline",
		open: h,
		onOpenChange: g,
		className: A("aui-tool-group-root", Qt({
			variant: t,
			className: e
		})),
		style: { "--animation-duration": `${Zt}ms` },
		...l,
		children: o
	}, void 0, !1, {
		fileName: Y,
		lineNumber: 73,
		columnNumber: 5
	}, this);
}
function en({ count: e, active: t = !1, className: n, ...r }) {
	let i = `${e} tool ${e === 1 ? "call" : "calls"}`;
	return /* @__PURE__ */ k(St, {
		"data-slot": "tool-group-trigger",
		className: A("aui-tool-group-trigger", J.trigger, n),
		...r,
		children: [
			t && /* @__PURE__ */ k(b, {
				"data-slot": "tool-group-trigger-loader",
				className: A("aui-tool-group-trigger-loader", J.triggerLoader)
			}, void 0, !1, {
				fileName: Y,
				lineNumber: 113,
				columnNumber: 9
			}, this),
			/* @__PURE__ */ k("span", {
				"data-slot": "tool-group-trigger-label",
				className: A("aui-tool-group-trigger-label-wrapper", J.labelWrapper),
				children: [/* @__PURE__ */ k("span", { children: i }, void 0, !1, {
					fileName: Y,
					lineNumber: 128,
					columnNumber: 9
				}, this), t && /* @__PURE__ */ k("span", {
					"aria-hidden": !0,
					"data-slot": "tool-group-trigger-shimmer",
					className: A("aui-tool-group-trigger-shimmer", J.shimmer),
					children: i
				}, void 0, !1, {
					fileName: Y,
					lineNumber: 130,
					columnNumber: 11
				}, this)]
			}, void 0, !0, {
				fileName: Y,
				lineNumber: 121,
				columnNumber: 7
			}, this),
			/* @__PURE__ */ k(m, {
				"data-slot": "tool-group-trigger-chevron",
				className: A("aui-tool-group-trigger-chevron", J.chevron)
			}, void 0, !1, {
				fileName: Y,
				lineNumber: 139,
				columnNumber: 7
			}, this)
		]
	}, void 0, !0, {
		fileName: Y,
		lineNumber: 107,
		columnNumber: 5
	}, this);
}
function tn({ className: e, children: t, ...n }) {
	return /* @__PURE__ */ k(Ct, {
		"data-slot": "tool-group-content",
		className: A("aui-tool-group-content", J.content, e),
		...n,
		children: /* @__PURE__ */ k("div", {
			className: J.contentInner,
			children: t
		}, void 0, !1, {
			fileName: Y,
			lineNumber: 158,
			columnNumber: 7
		}, this)
	}, void 0, !1, {
		fileName: Y,
		lineNumber: 153,
		columnNumber: 5
	}, this);
}
var nn = n(({ children: e, startIndex: t, endIndex: n }) => /* @__PURE__ */ k($t, { children: [/* @__PURE__ */ k(en, { count: n - t + 1 }, void 0, !1, {
	fileName: Y,
	lineNumber: 178,
	columnNumber: 7
}, void 0), /* @__PURE__ */ k(tn, { children: e }, void 0, !1, {
	fileName: Y,
	lineNumber: 179,
	columnNumber: 7
}, void 0)] }, void 0, !0, {
	fileName: Y,
	lineNumber: 177,
	columnNumber: 5
}, void 0));
nn.displayName = "ToolGroup", nn.Root = $t, nn.Trigger = en, nn.Content = tn;
var X = {
	root: "_root_ueb8a_36",
	viewport: "_viewport_ueb8a_44",
	viewportInner: "_viewportInner_ueb8a_54",
	viewportInnerCentered: "_viewportInnerCentered_ueb8a_65",
	messageGroup: "_messageGroup_ueb8a_69",
	viewportFooter: "_viewportFooter_ueb8a_79",
	viewportFooterDocked: "_viewportFooterDocked_ueb8a_93",
	scrollToBottom: "_scrollToBottom_ueb8a_105",
	welcomeRoot: "_welcomeRoot_ueb8a_128",
	welcomeHeading: "_welcomeHeading_ueb8a_137",
	suggestionsRoot: "_suggestionsRoot_ueb8a_144",
	suggestionItem: "_suggestionItem_ueb8a_154",
	suggestionButton: "_suggestionButton_ueb8a_161",
	suggestionText2: "_suggestionText2_ueb8a_179",
	composerRoot: "_composerRoot_ueb8a_187",
	composerShell: "_composerShell_ueb8a_194",
	composerInput: "_composerInput_ueb8a_235",
	composerActionWrapper: "_composerActionWrapper_ueb8a_251",
	composerButtonGroup: "_composerButtonGroup_ueb8a_258",
	composerDictate: "_composerDictate_ueb8a_267",
	dictateIcon: "_dictateIcon_ueb8a_272",
	composerStopDictation: "_composerStopDictation_ueb8a_277",
	stopDictationIcon: "_stopDictationIcon_ueb8a_288",
	composerSend: "_composerSend_ueb8a_298",
	sendIcon: "_sendIcon_ueb8a_305",
	composerCancel: "_composerCancel_ueb8a_310",
	cancelIcon: "_cancelIcon_ueb8a_315",
	messageErrorRoot: "_messageErrorRoot_ueb8a_325",
	messageErrorMessage: "_messageErrorMessage_ueb8a_340",
	assistantMessageRoot: "_assistantMessageRoot_ueb8a_351",
	assistantMessageContent: "_assistantMessageContent_ueb8a_356",
	assistantMessageIndicator: "_assistantMessageIndicator_ueb8a_365",
	assistantMessageFooter: "_assistantMessageFooter_ueb8a_373",
	assistantActionBarRoot: "_assistantActionBarRoot_ueb8a_382",
	actionBarMoreContent: "_actionBarMoreContent_ueb8a_391",
	actionBarMoreItem: "_actionBarMoreItem_ueb8a_411",
	exportIcon: "_exportIcon_ueb8a_436",
	userMessageRoot: "_userMessageRoot_ueb8a_445",
	userMessageContentWrapper: "_userMessageContentWrapper_ueb8a_460",
	userMessageContent: "_userMessageContent_ueb8a_460",
	userActionBarWrapper: "_userActionBarWrapper_ueb8a_478",
	userBranchPicker: "_userBranchPicker_ueb8a_498",
	userActionBarRoot: "_userActionBarRoot_ueb8a_506",
	editComposerWrapper: "_editComposerWrapper_ueb8a_516",
	editComposerRoot: "_editComposerRoot_ueb8a_522",
	editComposerInput: "_editComposerInput_ueb8a_544",
	editComposerFooter: "_editComposerFooter_ueb8a_558",
	editComposerButton: "_editComposerButton_ueb8a_569",
	branchPickerRoot: "_branchPickerRoot_ueb8a_579",
	branchPickerState: "_branchPickerState_ueb8a_589"
}, Z = "/Users/mbp352/Workspaces/robotics-web-services-workspace/worktrees/web-ui-vocabulary-dissolution/ui-components/src/aui/thread.tsx", rn = {}, an = e(rn), on = (e) => e.thread.messages.length === 0 && (!e.thread.isLoading || e.threads.isLoading), sn = ({ components: e = rn }) => {
	let t = E(on);
	return /* @__PURE__ */ k(an.Provider, {
		value: e,
		children: /* @__PURE__ */ k(cn, { isEmpty: t }, void 0, !1, {
			fileName: Z,
			lineNumber: 102,
			columnNumber: 7
		}, void 0)
	}, void 0, !1, {
		fileName: Z,
		lineNumber: 101,
		columnNumber: 5
	}, void 0);
}, cn = ({ isEmpty: e }) => {
	let { Welcome: t = dn } = i(an);
	return /* @__PURE__ */ k(T.Root, {
		className: A("aui-root aui-thread-root", X.root),
		style: {
			"--thread-max-width": "44rem",
			"--composer-bg": "color-mix(in oklab, var(--color-muted) 30%, var(--color-background))",
			"--composer-radius": "1.5rem",
			"--composer-padding": "8px"
		},
		children: /* @__PURE__ */ k(T.Viewport, {
			turnAnchor: "top",
			"data-slot": "aui_thread-viewport",
			className: X.viewport,
			children: /* @__PURE__ */ k("div", {
				className: A(X.viewportInner, e && X.viewportInnerCentered),
				children: [
					/* @__PURE__ */ k(S, {
						condition: on,
						children: /* @__PURE__ */ k(t, {}, void 0, !1, {
							fileName: Z,
							lineNumber: 133,
							columnNumber: 13
						}, void 0)
					}, void 0, !1, {
						fileName: Z,
						lineNumber: 132,
						columnNumber: 11
					}, void 0),
					/* @__PURE__ */ k("div", {
						"data-slot": "aui_message-group",
						className: X.messageGroup,
						children: /* @__PURE__ */ k(T.Messages, { children: () => /* @__PURE__ */ k(ln, {}, void 0, !1, {
							fileName: Z,
							lineNumber: 138,
							columnNumber: 22
						}, void 0) }, void 0, !1, {
							fileName: Z,
							lineNumber: 137,
							columnNumber: 13
						}, void 0)
					}, void 0, !1, {
						fileName: Z,
						lineNumber: 136,
						columnNumber: 11
					}, void 0),
					/* @__PURE__ */ k(T.ViewportFooter, {
						className: A("aui-thread-viewport-footer", X.viewportFooter, !e && X.viewportFooterDocked),
						children: [
							/* @__PURE__ */ k(un, {}, void 0, !1, {
								fileName: Z,
								lineNumber: 149,
								columnNumber: 13
							}, void 0),
							/* @__PURE__ */ k(mn, {}, void 0, !1, {
								fileName: Z,
								lineNumber: 150,
								columnNumber: 13
							}, void 0),
							/* @__PURE__ */ k(S, {
								condition: (e) => on(e) && e.composer.isEmpty,
								children: /* @__PURE__ */ k(fn, {}, void 0, !1, {
									fileName: Z,
									lineNumber: 152,
									columnNumber: 15
								}, void 0)
							}, void 0, !1, {
								fileName: Z,
								lineNumber: 151,
								columnNumber: 13
							}, void 0)
						]
					}, void 0, !0, {
						fileName: Z,
						lineNumber: 142,
						columnNumber: 11
					}, void 0)
				]
			}, void 0, !0, {
				fileName: Z,
				lineNumber: 126,
				columnNumber: 9
			}, void 0)
		}, void 0, !1, {
			fileName: Z,
			lineNumber: 121,
			columnNumber: 7
		}, void 0)
	}, void 0, !1, {
		fileName: Z,
		lineNumber: 111,
		columnNumber: 5
	}, void 0);
}, ln = () => {
	let { AssistantMessage: e = _n } = i(an), t = E((e) => e.message.role);
	return E((e) => e.message.composer.isEditing) ? /* @__PURE__ */ k(xn, {}, void 0, !1, {
		fileName: Z,
		lineNumber: 167,
		columnNumber: 25
	}, void 0) : t === "user" ? /* @__PURE__ */ k(yn, {}, void 0, !1, {
		fileName: Z,
		lineNumber: 168,
		columnNumber: 31
	}, void 0) : /* @__PURE__ */ k(e, {}, void 0, !1, {
		fileName: Z,
		lineNumber: 169,
		columnNumber: 10
	}, void 0);
}, un = () => /* @__PURE__ */ k(T.ScrollToBottom, {
	asChild: !0,
	children: /* @__PURE__ */ k(L, {
		tooltip: "Scroll to bottom",
		variant: "outline",
		className: A("aui-thread-scroll-to-bottom", X.scrollToBottom),
		children: /* @__PURE__ */ k(u, {}, void 0, !1, {
			fileName: Z,
			lineNumber: 180,
			columnNumber: 9
		}, void 0)
	}, void 0, !1, {
		fileName: Z,
		lineNumber: 175,
		columnNumber: 7
	}, void 0)
}, void 0, !1, {
	fileName: Z,
	lineNumber: 174,
	columnNumber: 5
}, void 0), dn = () => /* @__PURE__ */ k("div", {
	className: A("aui-thread-welcome-root", X.welcomeRoot),
	children: /* @__PURE__ */ k("h1", {
		className: A("aui-thread-welcome-message-inner", X.welcomeHeading),
		children: "How can I help you today?"
	}, void 0, !1, {
		fileName: Z,
		lineNumber: 189,
		columnNumber: 7
	}, void 0)
}, void 0, !1, {
	fileName: Z,
	lineNumber: 188,
	columnNumber: 5
}, void 0), fn = () => /* @__PURE__ */ k("div", {
	className: A("aui-thread-welcome-suggestions", X.suggestionsRoot),
	children: /* @__PURE__ */ k(T.Suggestions, { children: () => /* @__PURE__ */ k(pn, {}, void 0, !1, {
		fileName: Z,
		lineNumber: 207,
		columnNumber: 16
	}, void 0) }, void 0, !1, {
		fileName: Z,
		lineNumber: 206,
		columnNumber: 7
	}, void 0)
}, void 0, !1, {
	fileName: Z,
	lineNumber: 203,
	columnNumber: 5
}, void 0), pn = () => /* @__PURE__ */ k("div", {
	className: A("aui-thread-welcome-suggestion-display", X.suggestionItem),
	children: /* @__PURE__ */ k(_e.Trigger, {
		send: !0,
		asChild: !0,
		children: /* @__PURE__ */ k(N, {
			variant: "ghost",
			className: A("aui-thread-welcome-suggestion", X.suggestionButton),
			children: [/* @__PURE__ */ k(_e.Title, { className: "aui-thread-welcome-suggestion-text-1" }, void 0, !1, {
				fileName: Z,
				lineNumber: 229,
				columnNumber: 11
			}, void 0), /* @__PURE__ */ k(_e.Description, { className: A("aui-thread-welcome-suggestion-text-2", X.suggestionText2) }, void 0, !1, {
				fileName: Z,
				lineNumber: 230,
				columnNumber: 11
			}, void 0)]
		}, void 0, !0, {
			fileName: Z,
			lineNumber: 222,
			columnNumber: 9
		}, void 0)
	}, void 0, !1, {
		fileName: Z,
		lineNumber: 221,
		columnNumber: 7
	}, void 0)
}, void 0, !1, {
	fileName: Z,
	lineNumber: 215,
	columnNumber: 5
}, void 0), mn = () => /* @__PURE__ */ k(C.Root, {
	className: A("aui-composer-root", X.composerRoot),
	children: /* @__PURE__ */ k(C.AttachmentDropzone, {
		asChild: !0,
		children: /* @__PURE__ */ k("div", {
			"data-slot": "aui_composer-shell",
			className: X.composerShell,
			children: [
				/* @__PURE__ */ k(mt, {}, void 0, !1, {
					fileName: Z,
					lineNumber: 250,
					columnNumber: 11
				}, void 0),
				/* @__PURE__ */ k(C.Input, {
					placeholder: "Send a message...",
					className: A("aui-composer-input", X.composerInput),
					rows: 1,
					autoFocus: !0,
					"aria-label": "Message input"
				}, void 0, !1, {
					fileName: Z,
					lineNumber: 251,
					columnNumber: 11
				}, void 0),
				/* @__PURE__ */ k(hn, {}, void 0, !1, {
					fileName: Z,
					lineNumber: 258,
					columnNumber: 11
				}, void 0)
			]
		}, void 0, !0, {
			fileName: Z,
			lineNumber: 246,
			columnNumber: 9
		}, void 0)
	}, void 0, !1, {
		fileName: Z,
		lineNumber: 245,
		columnNumber: 7
	}, void 0)
}, void 0, !1, {
	fileName: Z,
	lineNumber: 244,
	columnNumber: 5
}, void 0), hn = () => /* @__PURE__ */ k("div", {
	className: A("aui-composer-action-wrapper", X.composerActionWrapper),
	children: [/* @__PURE__ */ k(ht, {}, void 0, !1, {
		fileName: Z,
		lineNumber: 273,
		columnNumber: 7
	}, void 0), /* @__PURE__ */ k("div", {
		className: X.composerButtonGroup,
		children: [
			/* @__PURE__ */ k(S, {
				condition: (e) => e.thread.capabilities.dictation,
				children: [/* @__PURE__ */ k(S, {
					condition: (e) => e.composer.dictation == null,
					children: /* @__PURE__ */ k(C.Dictate, {
						asChild: !0,
						children: /* @__PURE__ */ k(L, {
							tooltip: "Voice input",
							side: "bottom",
							type: "button",
							variant: "ghost",
							size: "icon",
							className: A("aui-composer-dictate", X.composerDictate),
							"aria-label": "Start voice input",
							children: /* @__PURE__ */ k(ee, { className: A("aui-composer-dictate-icon", X.dictateIcon) }, void 0, !1, {
								fileName: Z,
								lineNumber: 287,
								columnNumber: 17
							}, void 0)
						}, void 0, !1, {
							fileName: Z,
							lineNumber: 278,
							columnNumber: 15
						}, void 0)
					}, void 0, !1, {
						fileName: Z,
						lineNumber: 277,
						columnNumber: 13
					}, void 0)
				}, void 0, !1, {
					fileName: Z,
					lineNumber: 276,
					columnNumber: 11
				}, void 0), /* @__PURE__ */ k(S, {
					condition: (e) => e.composer.dictation != null,
					children: /* @__PURE__ */ k(C.StopDictation, {
						asChild: !0,
						children: /* @__PURE__ */ k(L, {
							tooltip: "Stop dictation",
							side: "bottom",
							type: "button",
							variant: "ghost",
							size: "icon",
							className: A("aui-composer-stop-dictation", X.composerStopDictation),
							"aria-label": "Stop voice input",
							children: /* @__PURE__ */ k(ce, { className: A("aui-composer-stop-dictation-icon", X.stopDictationIcon) }, void 0, !1, {
								fileName: Z,
								lineNumber: 305,
								columnNumber: 17
							}, void 0)
						}, void 0, !1, {
							fileName: Z,
							lineNumber: 293,
							columnNumber: 15
						}, void 0)
					}, void 0, !1, {
						fileName: Z,
						lineNumber: 292,
						columnNumber: 13
					}, void 0)
				}, void 0, !1, {
					fileName: Z,
					lineNumber: 291,
					columnNumber: 11
				}, void 0)]
			}, void 0, !0, {
				fileName: Z,
				lineNumber: 275,
				columnNumber: 9
			}, void 0),
			/* @__PURE__ */ k(S, {
				condition: (e) => !e.thread.isRunning,
				children: /* @__PURE__ */ k(C.Send, {
					asChild: !0,
					children: /* @__PURE__ */ k(L, {
						tooltip: "Send message",
						side: "bottom",
						type: "button",
						variant: "default",
						size: "icon",
						className: A("aui-composer-send", X.composerSend),
						"aria-label": "Send message",
						children: /* @__PURE__ */ k(d, { className: A("aui-composer-send-icon", X.sendIcon) }, void 0, !1, {
							fileName: Z,
							lineNumber: 326,
							columnNumber: 15
						}, void 0)
					}, void 0, !1, {
						fileName: Z,
						lineNumber: 317,
						columnNumber: 13
					}, void 0)
				}, void 0, !1, {
					fileName: Z,
					lineNumber: 316,
					columnNumber: 11
				}, void 0)
			}, void 0, !1, {
				fileName: Z,
				lineNumber: 315,
				columnNumber: 9
			}, void 0),
			/* @__PURE__ */ k(S, {
				condition: (e) => e.thread.isRunning,
				children: /* @__PURE__ */ k(C.Cancel, {
					asChild: !0,
					children: /* @__PURE__ */ k(N, {
						type: "button",
						variant: "default",
						size: "icon",
						className: A("aui-composer-cancel", X.composerCancel),
						"aria-label": "Stop generating",
						children: /* @__PURE__ */ k(ce, { className: A("aui-composer-cancel-icon", X.cancelIcon) }, void 0, !1, {
							fileName: Z,
							lineNumber: 339,
							columnNumber: 15
						}, void 0)
					}, void 0, !1, {
						fileName: Z,
						lineNumber: 332,
						columnNumber: 13
					}, void 0)
				}, void 0, !1, {
					fileName: Z,
					lineNumber: 331,
					columnNumber: 11
				}, void 0)
			}, void 0, !1, {
				fileName: Z,
				lineNumber: 330,
				columnNumber: 9
			}, void 0)
		]
	}, void 0, !0, {
		fileName: Z,
		lineNumber: 274,
		columnNumber: 7
	}, void 0)]
}, void 0, !0, {
	fileName: Z,
	lineNumber: 267,
	columnNumber: 5
}, void 0), gn = () => /* @__PURE__ */ k(w.Error, { children: /* @__PURE__ */ k(he.Root, {
	className: A("aui-message-error-root", X.messageErrorRoot),
	children: /* @__PURE__ */ k(he.Message, { className: A("aui-message-error-message", X.messageErrorMessage) }, void 0, !1, {
		fileName: Z,
		lineNumber: 352,
		columnNumber: 9
	}, void 0)
}, void 0, !1, {
	fileName: Z,
	lineNumber: 351,
	columnNumber: 7
}, void 0) }, void 0, !1, {
	fileName: Z,
	lineNumber: 350,
	columnNumber: 5
}, void 0), _n = () => {
	let { ToolFallback: e = q, ToolGroup: t, ReasoningGroup: n } = i(an);
	return /* @__PURE__ */ k(w.Root, {
		"data-slot": "aui_assistant-message-root",
		"data-role": "assistant",
		className: X.assistantMessageRoot,
		children: [/* @__PURE__ */ k("div", {
			"data-slot": "aui_assistant-message-content",
			className: X.assistantMessageContent,
			children: [/* @__PURE__ */ k(w.GroupedParts, {
				groupBy: ye({
					reasoning: ["group-chainOfThought", "group-reasoning"],
					"tool-call": ["group-chainOfThought", "group-tool"],
					"standalone-tool-call": []
				}),
				children: ({ part: r, children: i }) => {
					switch (r.type) {
						case "group-chainOfThought": return /* @__PURE__ */ k("div", {
							"data-slot": "aui_chain-of-thought",
							children: i
						}, void 0, !1, {
							fileName: Z,
							lineNumber: 389,
							columnNumber: 24
						}, void 0);
						case "group-tool": return t ? /* @__PURE__ */ k(t, {
							group: r,
							children: i
						}, void 0, !1, {
							fileName: Z,
							lineNumber: 392,
							columnNumber: 26
						}, void 0) : /* @__PURE__ */ k($t, {
							variant: "ghost",
							children: [/* @__PURE__ */ k(en, {
								count: r.indices.length,
								active: r.status.type === "running"
							}, void 0, !1, {
								fileName: Z,
								lineNumber: 396,
								columnNumber: 21
							}, void 0), /* @__PURE__ */ k(tn, { children: i }, void 0, !1, {
								fileName: Z,
								lineNumber: 400,
								columnNumber: 21
							}, void 0)]
						}, void 0, !0, {
							fileName: Z,
							lineNumber: 395,
							columnNumber: 19
						}, void 0);
						case "group-reasoning": {
							if (n) return /* @__PURE__ */ k(n, {
								group: r,
								children: i
							}, void 0, !1, {
								fileName: Z,
								lineNumber: 406,
								columnNumber: 21
							}, void 0);
							let e = r.status.type === "running";
							return /* @__PURE__ */ k(Dt, {
								streaming: e,
								children: [/* @__PURE__ */ k(kt, { active: e }, void 0, !1, {
									fileName: Z,
									lineNumber: 412,
									columnNumber: 21
								}, void 0), /* @__PURE__ */ k(At, {
									"aria-busy": e,
									children: /* @__PURE__ */ k(jt, { children: i }, void 0, !1, {
										fileName: Z,
										lineNumber: 414,
										columnNumber: 23
									}, void 0)
								}, void 0, !1, {
									fileName: Z,
									lineNumber: 413,
									columnNumber: 21
								}, void 0)]
							}, void 0, !0, {
								fileName: Z,
								lineNumber: 411,
								columnNumber: 19
							}, void 0);
						}
						case "text": return /* @__PURE__ */ k(gt, {}, void 0, !1, {
							fileName: Z,
							lineNumber: 420,
							columnNumber: 24
						}, void 0);
						case "reasoning": return /* @__PURE__ */ k(W, { ...r }, void 0, !1, {
							fileName: Z,
							lineNumber: 422,
							columnNumber: 24
						}, void 0);
						case "tool-call": return r.toolUI ?? /* @__PURE__ */ k(e, { ...r }, void 0, !1, {
							fileName: Z,
							lineNumber: 424,
							columnNumber: 39
						}, void 0);
						case "data": return r.dataRendererUI;
						case "indicator": return /* @__PURE__ */ k("span", {
							"data-slot": "aui_assistant-message-indicator",
							className: X.assistantMessageIndicator,
							"aria-label": "Assistant is working",
							children: "●"
						}, void 0, !1, {
							fileName: Z,
							lineNumber: 429,
							columnNumber: 19
						}, void 0);
						default: return null;
					}
				}
			}, void 0, !1, {
				fileName: Z,
				lineNumber: 379,
				columnNumber: 9
			}, void 0), /* @__PURE__ */ k(gn, {}, void 0, !1, {
				fileName: Z,
				lineNumber: 442,
				columnNumber: 9
			}, void 0)]
		}, void 0, !0, {
			fileName: Z,
			lineNumber: 373,
			columnNumber: 7
		}, void 0), /* @__PURE__ */ k("div", {
			"data-slot": "aui_assistant-message-footer",
			className: X.assistantMessageFooter,
			children: [/* @__PURE__ */ k(Sn, {}, void 0, !1, {
				fileName: Z,
				lineNumber: 449,
				columnNumber: 9
			}, void 0), /* @__PURE__ */ k(vn, {}, void 0, !1, {
				fileName: Z,
				lineNumber: 450,
				columnNumber: 9
			}, void 0)]
		}, void 0, !0, {
			fileName: Z,
			lineNumber: 445,
			columnNumber: 7
		}, void 0)]
	}, void 0, !0, {
		fileName: Z,
		lineNumber: 368,
		columnNumber: 5
	}, void 0);
}, vn = () => /* @__PURE__ */ k(x.Root, {
	hideWhenRunning: !0,
	autohide: "not-last",
	className: A("aui-assistant-action-bar-root", X.assistantActionBarRoot),
	children: [
		/* @__PURE__ */ k(x.Copy, {
			asChild: !0,
			children: /* @__PURE__ */ k(L, {
				tooltip: "Copy",
				children: [/* @__PURE__ */ k(S, {
					condition: (e) => e.message.isCopied,
					children: /* @__PURE__ */ k(p, {}, void 0, !1, {
						fileName: Z,
						lineNumber: 469,
						columnNumber: 13
					}, void 0)
				}, void 0, !1, {
					fileName: Z,
					lineNumber: 468,
					columnNumber: 11
				}, void 0), /* @__PURE__ */ k(S, {
					condition: (e) => !e.message.isCopied,
					children: /* @__PURE__ */ k(_, {}, void 0, !1, {
						fileName: Z,
						lineNumber: 472,
						columnNumber: 13
					}, void 0)
				}, void 0, !1, {
					fileName: Z,
					lineNumber: 471,
					columnNumber: 11
				}, void 0)]
			}, void 0, !0, {
				fileName: Z,
				lineNumber: 467,
				columnNumber: 9
			}, void 0)
		}, void 0, !1, {
			fileName: Z,
			lineNumber: 466,
			columnNumber: 7
		}, void 0),
		/* @__PURE__ */ k(x.Reload, {
			asChild: !0,
			children: /* @__PURE__ */ k(L, {
				tooltip: "Refresh",
				children: /* @__PURE__ */ k(se, {}, void 0, !1, {
					fileName: Z,
					lineNumber: 478,
					columnNumber: 11
				}, void 0)
			}, void 0, !1, {
				fileName: Z,
				lineNumber: 477,
				columnNumber: 9
			}, void 0)
		}, void 0, !1, {
			fileName: Z,
			lineNumber: 476,
			columnNumber: 7
		}, void 0),
		/* @__PURE__ */ k(de.Root, { children: [/* @__PURE__ */ k(de.Trigger, {
			asChild: !0,
			children: /* @__PURE__ */ k(L, {
				tooltip: "More",
				children: /* @__PURE__ */ k(ne, {}, void 0, !1, {
					fileName: Z,
					lineNumber: 484,
					columnNumber: 13
				}, void 0)
			}, void 0, !1, {
				fileName: Z,
				lineNumber: 483,
				columnNumber: 11
			}, void 0)
		}, void 0, !1, {
			fileName: Z,
			lineNumber: 482,
			columnNumber: 9
		}, void 0), /* @__PURE__ */ k(de.Content, {
			side: "bottom",
			align: "start",
			sideOffset: 6,
			className: A("aui-action-bar-more-content", X.actionBarMoreContent),
			children: /* @__PURE__ */ k(x.ExportMarkdown, {
				asChild: !0,
				children: /* @__PURE__ */ k(de.Item, {
					className: A("aui-action-bar-more-item", X.actionBarMoreItem),
					children: [/* @__PURE__ */ k(v, { className: X.exportIcon }, void 0, !1, {
						fileName: Z,
						lineNumber: 497,
						columnNumber: 15
					}, void 0), "Export as Markdown"]
				}, void 0, !0, {
					fileName: Z,
					lineNumber: 494,
					columnNumber: 13
				}, void 0)
			}, void 0, !1, {
				fileName: Z,
				lineNumber: 493,
				columnNumber: 11
			}, void 0)
		}, void 0, !1, {
			fileName: Z,
			lineNumber: 487,
			columnNumber: 9
		}, void 0)] }, void 0, !0, {
			fileName: Z,
			lineNumber: 481,
			columnNumber: 7
		}, void 0)
	]
}, void 0, !0, {
	fileName: Z,
	lineNumber: 458,
	columnNumber: 5
}, void 0), yn = () => /* @__PURE__ */ k(w.Root, {
	"data-slot": "aui_user-message-root",
	className: X.userMessageRoot,
	"data-role": "user",
	children: [
		/* @__PURE__ */ k(pt, {}, void 0, !1, {
			fileName: Z,
			lineNumber: 514,
			columnNumber: 7
		}, void 0),
		/* @__PURE__ */ k("div", {
			className: A("aui-user-message-content-wrapper", X.userMessageContentWrapper),
			children: [/* @__PURE__ */ k("div", {
				className: A("aui-user-message-content", X.userMessageContent),
				children: /* @__PURE__ */ k(w.Parts, {}, void 0, !1, {
					fileName: Z,
					lineNumber: 523,
					columnNumber: 11
				}, void 0)
			}, void 0, !1, {
				fileName: Z,
				lineNumber: 522,
				columnNumber: 9
			}, void 0), /* @__PURE__ */ k("div", {
				className: A("aui-user-action-bar-wrapper", X.userActionBarWrapper),
				children: /* @__PURE__ */ k(bn, {}, void 0, !1, {
					fileName: Z,
					lineNumber: 531,
					columnNumber: 11
				}, void 0)
			}, void 0, !1, {
				fileName: Z,
				lineNumber: 525,
				columnNumber: 9
			}, void 0)]
		}, void 0, !0, {
			fileName: Z,
			lineNumber: 516,
			columnNumber: 7
		}, void 0),
		/* @__PURE__ */ k(Sn, {
			"data-slot": "aui_user-branch-picker",
			className: X.userBranchPicker
		}, void 0, !1, {
			fileName: Z,
			lineNumber: 535,
			columnNumber: 7
		}, void 0)
	]
}, void 0, !0, {
	fileName: Z,
	lineNumber: 509,
	columnNumber: 5
}, void 0), bn = () => /* @__PURE__ */ k(x.Root, {
	hideWhenRunning: !0,
	autohide: "not-last",
	className: A("aui-user-action-bar-root", X.userActionBarRoot),
	children: /* @__PURE__ */ k(x.Edit, {
		asChild: !0,
		children: /* @__PURE__ */ k(L, {
			tooltip: "Edit",
			className: "aui-user-action-edit",
			children: /* @__PURE__ */ k(re, {}, void 0, !1, {
				fileName: Z,
				lineNumber: 552,
				columnNumber: 11
			}, void 0)
		}, void 0, !1, {
			fileName: Z,
			lineNumber: 551,
			columnNumber: 9
		}, void 0)
	}, void 0, !1, {
		fileName: Z,
		lineNumber: 550,
		columnNumber: 7
	}, void 0)
}, void 0, !1, {
	fileName: Z,
	lineNumber: 545,
	columnNumber: 5
}, void 0), xn = () => /* @__PURE__ */ k(w.Root, {
	"data-slot": "aui_edit-composer-wrapper",
	className: X.editComposerWrapper,
	children: /* @__PURE__ */ k(C.Root, {
		className: A("aui-edit-composer-root", X.editComposerRoot),
		children: [/* @__PURE__ */ k(C.Input, {
			className: A("aui-edit-composer-input", X.editComposerInput),
			autoFocus: !0
		}, void 0, !1, {
			fileName: Z,
			lineNumber: 568,
			columnNumber: 9
		}, void 0), /* @__PURE__ */ k("div", {
			className: A("aui-edit-composer-footer", X.editComposerFooter),
			children: [/* @__PURE__ */ k(C.Cancel, {
				asChild: !0,
				children: /* @__PURE__ */ k(N, {
					variant: "ghost",
					size: "sm",
					className: X.editComposerButton,
					children: "Cancel"
				}, void 0, !1, {
					fileName: Z,
					lineNumber: 574,
					columnNumber: 13
				}, void 0)
			}, void 0, !1, {
				fileName: Z,
				lineNumber: 573,
				columnNumber: 11
			}, void 0), /* @__PURE__ */ k(C.Send, {
				asChild: !0,
				children: /* @__PURE__ */ k(N, {
					size: "sm",
					className: X.editComposerButton,
					children: "Update"
				}, void 0, !1, {
					fileName: Z,
					lineNumber: 583,
					columnNumber: 13
				}, void 0)
			}, void 0, !1, {
				fileName: Z,
				lineNumber: 582,
				columnNumber: 11
			}, void 0)]
		}, void 0, !0, {
			fileName: Z,
			lineNumber: 572,
			columnNumber: 9
		}, void 0)]
	}, void 0, !0, {
		fileName: Z,
		lineNumber: 565,
		columnNumber: 7
	}, void 0)
}, void 0, !1, {
	fileName: Z,
	lineNumber: 561,
	columnNumber: 5
}, void 0), Sn = ({ className: e, ...t }) => /* @__PURE__ */ k(me.Root, {
	hideWhenSingleBranch: !0,
	className: A("aui-branch-picker-root", X.branchPickerRoot, e),
	...t,
	children: [
		/* @__PURE__ */ k(me.Previous, {
			asChild: !0,
			children: /* @__PURE__ */ k(L, {
				tooltip: "Previous",
				children: /* @__PURE__ */ k(h, {}, void 0, !1, {
					fileName: Z,
					lineNumber: 605,
					columnNumber: 11
				}, void 0)
			}, void 0, !1, {
				fileName: Z,
				lineNumber: 604,
				columnNumber: 9
			}, void 0)
		}, void 0, !1, {
			fileName: Z,
			lineNumber: 603,
			columnNumber: 7
		}, void 0),
		/* @__PURE__ */ k("span", {
			className: A("aui-branch-picker-state", X.branchPickerState),
			children: [
				/* @__PURE__ */ k(me.Number, {}, void 0, !1, {
					fileName: Z,
					lineNumber: 609,
					columnNumber: 9
				}, void 0),
				" / ",
				/* @__PURE__ */ k(me.Count, {}, void 0, !1, {
					fileName: Z,
					lineNumber: 609,
					columnNumber: 44
				}, void 0)
			]
		}, void 0, !0, {
			fileName: Z,
			lineNumber: 608,
			columnNumber: 7
		}, void 0),
		/* @__PURE__ */ k(me.Next, {
			asChild: !0,
			children: /* @__PURE__ */ k(L, {
				tooltip: "Next",
				children: /* @__PURE__ */ k(g, {}, void 0, !1, {
					fileName: Z,
					lineNumber: 613,
					columnNumber: 11
				}, void 0)
			}, void 0, !1, {
				fileName: Z,
				lineNumber: 612,
				columnNumber: 9
			}, void 0)
		}, void 0, !1, {
			fileName: Z,
			lineNumber: 611,
			columnNumber: 7
		}, void 0)
	]
}, void 0, !0, {
	fileName: Z,
	lineNumber: 598,
	columnNumber: 5
}, void 0), Q = {
	voiceControl: "_voiceControl_1fagr_1",
	voiceStatus: "_voiceStatus_1fagr_11",
	voiceStatusDot: "_voiceStatusDot_1fagr_19",
	voiceStatusDotIdle: "_voiceStatusDotIdle_1fagr_29",
	voiceStatusDotConnecting: "_voiceStatusDotConnecting_1fagr_33",
	voiceStatusDotActive: "_voiceStatusDotActive_1fagr_41",
	voiceStatusDotMuted: "_voiceStatusDotMuted_1fagr_45",
	voiceOrb: "_voiceOrb_1fagr_50",
	connectButton: "_connectButton_1fagr_62",
	connectIcon: "_connectIcon_1fagr_67",
	disconnectButton: "_disconnectButton_1fagr_78"
}, $ = "/Users/mbp352/Workspaces/robotics-web-services-workspace/worktrees/web-ui-vocabulary-dissolution/ui-components/src/aui/voice.tsx", Cn = {
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
}, wn = {
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
}, Tn = "#version 300 es\nin vec2 a_position;\nout vec2 v_uv;\nvoid main() {\n  v_uv = a_position * 0.5 + 0.5;\n  gl_Position = vec4(a_position, 0.0, 1.0);\n}", En = "#version 300 es\nprecision highp float;\n\nin vec2 v_uv;\nout vec4 fragColor;\n\nuniform float u_time;\nuniform float u_speed;\nuniform float u_amplitude;\nuniform float u_glow;\nuniform float u_brightness;\nuniform float u_pulse;\nuniform float u_saturation;\nuniform vec3 u_color0;\nuniform vec3 u_color1;\nuniform vec3 u_color2;\nuniform float u_dpr;\n\n// Simplex-like noise (3D)\nvec3 mod289(vec3 x) { return x - floor(x / 289.0) * 289.0; }\nvec4 mod289(vec4 x) { return x - floor(x / 289.0) * 289.0; }\nvec4 permute(vec4 x) { return mod289((x * 34.0 + 1.0) * x); }\nvec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }\n\nfloat snoise(vec3 v) {\n  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);\n  vec3 i = floor(v + dot(v, vec3(C.y)));\n  vec3 x0 = v - i + dot(i, vec3(C.x));\n  vec3 g = step(x0.yzx, x0.xyz);\n  vec3 l = 1.0 - g;\n  vec3 i1 = min(g, l.zxy);\n  vec3 i2 = max(g, l.zxy);\n  vec3 x1 = x0 - i1 + C.x;\n  vec3 x2 = x0 - i2 + C.y;\n  vec3 x3 = x0 - 0.5;\n  i = mod289(i);\n  vec4 p = permute(permute(permute(\n    i.z + vec4(0.0, i1.z, i2.z, 1.0))\n    + i.y + vec4(0.0, i1.y, i2.y, 1.0))\n    + i.x + vec4(0.0, i1.x, i2.x, 1.0));\n  vec4 j = p - 49.0 * floor(p / 49.0);\n  vec4 x_ = floor(j / 7.0);\n  vec4 y_ = floor(j - 7.0 * x_);\n  vec4 x = (x_ * 2.0 + 0.5) / 7.0 - 1.0;\n  vec4 y = (y_ * 2.0 + 0.5) / 7.0 - 1.0;\n  vec4 h = 1.0 - abs(x) - abs(y);\n  vec4 b0 = vec4(x.xy, y.xy);\n  vec4 b1 = vec4(x.zw, y.zw);\n  vec4 s0 = floor(b0) * 2.0 + 1.0;\n  vec4 s1 = floor(b1) * 2.0 + 1.0;\n  vec4 sh = -step(h, vec4(0.0));\n  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;\n  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;\n  vec3 g0 = vec3(a0.xy, h.x);\n  vec3 g1 = vec3(a0.zw, h.y);\n  vec3 g2 = vec3(a1.xy, h.z);\n  vec3 g3 = vec3(a1.zw, h.w);\n  vec4 norm = taylorInvSqrt(vec4(dot(g0,g0), dot(g1,g1), dot(g2,g2), dot(g3,g3)));\n  g0 *= norm.x; g1 *= norm.y; g2 *= norm.z; g3 *= norm.w;\n  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);\n  m = m * m;\n  return 42.0 * dot(m * m, vec4(dot(g0,x0), dot(g1,x1), dot(g2,x2), dot(g3,x3)));\n}\n\nvoid main() {\n  vec2 uv = v_uv * 2.0 - 1.0;\n  float dist = length(uv);\n  float t = u_time * u_speed;\n\n  // Perfect circle — hard boundary, soft anti-aliased edge\n  float radius = 0.44;\n  float circle = 1.0 - smoothstep(radius - 0.008, radius + 0.008, dist);\n\n  if (circle < 0.001) {\n    // Outer glow only\n    float glowDist = dist - radius;\n    float glow = exp(-glowDist * 12.0) * u_glow * 0.4;\n    vec3 glowColor = mix(u_color0, u_color1, 0.5);\n    fragColor = vec4(glowColor * glow, glow);\n    return;\n  }\n\n  float n1 = snoise(vec3(uv * 2.0, t * 0.6)) * 0.5 + 0.5;\n  float n2 = snoise(vec3(uv * 3.5 + 7.0, t * 0.9)) * 0.5 + 0.5;\n  float n3 = snoise(vec3(uv * 1.5 - 3.0, t * 0.4 + 10.0)) * 0.5 + 0.5;\n\n  vec2 distort = vec2(\n    snoise(vec3(uv * 2.0 + 5.0, t * 0.7)),\n    snoise(vec3(uv * 2.0 + 15.0, t * 0.7))\n  ) * u_amplitude * 2.0;\n  float n4 = snoise(vec3((uv + distort) * 3.0, t * 0.5)) * 0.5 + 0.5;\n\n  vec3 col = mix(u_color0, u_color1, n1);\n  col = mix(col, u_color2, n2 * 0.5);\n  col = mix(col, u_color1 * 1.3, n4 * 0.4);\n\n  float vein = pow(n3, 3.0) * u_amplitude * 6.0;\n  col += vein * mix(u_color1, vec3(1.0), 0.3);\n\n  float centerDist = dist / radius;\n  float depthShade = 1.0 - centerDist * centerDist * 0.4;\n  col *= depthShade;\n\n  float rim = pow(centerDist, 4.0) * 0.6;\n  col += rim * mix(u_color0, vec3(1.0), 0.5);\n\n  vec2 lightPos = vec2(-0.15, -0.18);\n  float specDist = length(uv - lightPos);\n  float spec = exp(-specDist * specDist * 30.0) * 0.7;\n  col += spec * vec3(1.0);\n\n  vec2 lightPos2 = vec2(0.2, 0.25);\n  float spec2 = exp(-length(uv - lightPos2) * 8.0) * 0.15;\n  col += spec2 * u_color1;\n\n  float pulseFactor = 1.0 + u_pulse * sin(u_time * 3.5) * 0.35;\n\n  float lum = dot(col, vec3(0.299, 0.587, 0.114));\n  col = mix(vec3(lum), col, u_saturation);\n\n  col *= u_brightness * pulseFactor;\n\n  fragColor = vec4(col, circle);\n}";
function Dn(e, t, n) {
	let r = e.createShader(t);
	return r ? (e.shaderSource(r, n), e.compileShader(r), e.getShaderParameter(r, e.COMPILE_STATUS) ? r : (e.deleteShader(r), null)) : null;
}
function On(e) {
	let t = e.getContext("webgl2", {
		alpha: !0,
		premultipliedAlpha: !1,
		antialias: !0
	});
	if (!t) return null;
	let n = Dn(t, t.VERTEX_SHADER, Tn), r = Dn(t, t.FRAGMENT_SHADER, En);
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
function kn(e, t, n) {
	return e + (t - e) * n;
}
function An(e) {
	return e ? e.status.type === "starting" ? "connecting" : e.status.type === "ended" ? "idle" : e.isMuted ? "muted" : e.mode === "speaking" ? "speaking" : "listening" : "idle";
}
var jn = n(({ state: e, variant: t = "default", className: n }) => {
	let i = Te(), o = e ?? An(i), l = Ee(), u = s(0);
	u.current = l;
	let d = s(null), f = s(null), p = s(0), m = s(performance.now()), h = s({ ...wn.idle }), g = s({ ...wn.idle });
	a(() => {
		g.current = { ...wn[o] };
	}, [o]);
	let _ = Cn[t], [v, y] = c(!1);
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
		i.speed = kn(i.speed, a.speed, o), i.amplitude = kn(i.amplitude, a.amplitude, o), i.glow = kn(i.glow, a.glow, o), i.brightness = kn(i.brightness, a.brightness, o), i.pulse = kn(i.pulse, a.pulse, o), i.saturation = kn(i.saturation, a.saturation, o);
		let s = (performance.now() - m.current) / 1e3, c = window.devicePixelRatio || 1, l = r.getBoundingClientRect(), v = Math.round(l.width * c), y = Math.round(l.height * c);
		(r.width !== v || r.height !== y) && (r.width = v, r.height = y), t.viewport(0, 0, v, y), t.clearColor(0, 0, 0, 0), t.clear(t.COLOR_BUFFER_BIT);
		let ee = u.current;
		t.uniform1f(n.u_time, s), t.uniform1f(n.u_speed, i.speed + ee * .4), t.uniform1f(n.u_amplitude, i.amplitude + ee * .12), t.uniform1f(n.u_glow, i.glow + ee * .2), t.uniform1f(n.u_brightness, i.brightness), t.uniform1f(n.u_pulse, i.pulse), t.uniform1f(n.u_saturation, i.saturation), t.uniform3fv(n.u_color0, _[0]), t.uniform3fv(n.u_color1, _[1]), t.uniform3fv(n.u_color2, _[2]), t.uniform1f(n.u_dpr, c), t.drawArrays(t.TRIANGLE_STRIP, 0, 4), p.current = requestAnimationFrame(b);
	}, [_]);
	return a(() => {
		if (!v) return;
		let e = d.current;
		if (e && (f.current = On(e), f.current)) return p.current = requestAnimationFrame(b), () => {
			cancelAnimationFrame(p.current);
			let e = f.current;
			e && e.gl.getExtension("WEBGL_lose_context")?.loseContext(), f.current = null;
		};
	}, [v, b]), /* @__PURE__ */ k("canvas", {
		ref: d,
		className: A("aui-voice-orb", Q.voiceOrb, n),
		"data-state": o
	}, void 0, !1, {
		fileName: $,
		lineNumber: 423,
		columnNumber: 7
	}, void 0);
});
jn.displayName = "VoiceOrb";
var Mn = ({ className: e }) => /* @__PURE__ */ k("div", {
	className: A("aui-voice-control", Q.voiceControl, e),
	children: [
		/* @__PURE__ */ k(Nn, {}, void 0, !1, {
			fileName: $,
			lineNumber: 437,
			columnNumber: 7
		}, void 0),
		/* @__PURE__ */ k(S, {
			condition: (e) => e.thread.voice == null || e.thread.voice.status.type === "ended",
			children: /* @__PURE__ */ k(Pn, {}, void 0, !1, {
				fileName: $,
				lineNumber: 444,
				columnNumber: 9
			}, void 0)
		}, void 0, !1, {
			fileName: $,
			lineNumber: 439,
			columnNumber: 7
		}, void 0),
		/* @__PURE__ */ k(S, {
			condition: (e) => e.thread.voice?.status.type === "starting",
			children: /* @__PURE__ */ k("span", {
				className: A("aui-voice-status", Q.voiceStatus),
				children: "Connecting..."
			}, void 0, !1, {
				fileName: $,
				lineNumber: 448,
				columnNumber: 9
			}, void 0)
		}, void 0, !1, {
			fileName: $,
			lineNumber: 447,
			columnNumber: 7
		}, void 0),
		/* @__PURE__ */ k(S, {
			condition: (e) => e.thread.voice?.status.type === "running",
			children: [/* @__PURE__ */ k(Fn, {}, void 0, !1, {
				fileName: $,
				lineNumber: 454,
				columnNumber: 9
			}, void 0), /* @__PURE__ */ k(In, {}, void 0, !1, {
				fileName: $,
				lineNumber: 455,
				columnNumber: 9
			}, void 0)]
		}, void 0, !0, {
			fileName: $,
			lineNumber: 453,
			columnNumber: 7
		}, void 0)
	]
}, void 0, !0, {
	fileName: $,
	lineNumber: 436,
	columnNumber: 5
}, void 0), Nn = () => {
	let e = An(Te());
	return /* @__PURE__ */ k("span", { className: A("aui-voice-status-dot", Q.voiceStatusDot, e === "idle" && Q.voiceStatusDotIdle, e === "connecting" && Q.voiceStatusDotConnecting, e === "listening" && Q.voiceStatusDotActive, e === "speaking" && Q.voiceStatusDotActive, e === "muted" && Q.voiceStatusDotMuted) }, void 0, !1, {
		fileName: $,
		lineNumber: 466,
		columnNumber: 5
	}, void 0);
}, Pn = () => {
	let { connect: e } = we();
	return /* @__PURE__ */ k(N, {
		variant: "default",
		size: "sm",
		className: A("aui-voice-connect", Q.connectButton),
		onClick: () => e(),
		children: [/* @__PURE__ */ k(ie, { className: Q.connectIcon }, void 0, !1, {
			fileName: $,
			lineNumber: 489,
			columnNumber: 7
		}, void 0), "Connect"]
	}, void 0, !0, {
		fileName: $,
		lineNumber: 483,
		columnNumber: 5
	}, void 0);
}, Fn = () => {
	let e = Te(), { mute: t, unmute: n } = we(), r = e?.isMuted ?? !1;
	return /* @__PURE__ */ k(L, {
		tooltip: r ? "Unmute" : "Mute",
		className: "aui-voice-mute",
		onClick: () => r ? n() : t(),
		children: r ? /* @__PURE__ */ k(te, {}, void 0, !1, {
			fileName: $,
			lineNumber: 506,
			columnNumber: 18
		}, void 0) : /* @__PURE__ */ k(ee, {}, void 0, !1, {
			fileName: $,
			lineNumber: 506,
			columnNumber: 35
		}, void 0)
	}, void 0, !1, {
		fileName: $,
		lineNumber: 501,
		columnNumber: 5
	}, void 0);
}, In = () => {
	let { disconnect: e } = we();
	return /* @__PURE__ */ k(L, {
		tooltip: "Disconnect",
		className: A("aui-voice-disconnect", Q.disconnectButton),
		onClick: () => e(),
		children: /* @__PURE__ */ k(ae, {}, void 0, !1, {
			fileName: $,
			lineNumber: 519,
			columnNumber: 7
		}, void 0)
	}, void 0, !1, {
		fileName: $,
		lineNumber: 514,
		columnNumber: 5
	}, void 0);
};
//#endregion
export { fe as AssistantRuntimeProvider, nt as Avatar, it as AvatarFallback, rt as AvatarImage, N as Button, xt as Collapsible, Ct as CollapsibleContent, St as CollapsibleTrigger, ht as ComposerAddAttachment, mt as ComposerAttachments, We as Dialog, qe as DialogClose, Ye as DialogContent, $e as DialogDescription, Ze as DialogFooter, Xe as DialogHeader, Je as DialogOverlay, Ke as DialogPortal, Qe as DialogTitle, Ge as DialogTrigger, gt as MarkdownText, ge as ReadonlyThreadProvider, W as Reasoning, At as ReasoningContent, Dt as ReasoningRoot, jt as ReasoningText, kt as ReasoningTrigger, sn as Thread, q as ToolFallback, tn as ToolGroupContent, $t as ToolGroupRoot, en as ToolGroupTrigger, ze as Tooltip, Ve as TooltipContent, L as TooltipIconButton, Re as TooltipProvider, Be as TooltipTrigger, pt as UserMessageAttachments, Pn as VoiceConnectButton, Mn as VoiceControl, In as VoiceDisconnectButton, Fn as VoiceMuteButton, jn as VoiceOrb, Nn as VoiceStatusDot, Ue as buttonVariants, A as cn, An as deriveVoiceOrbState, ve as fromThreadMessageLike, xe as useLocalRuntime };

//# sourceMappingURL=index.js.map