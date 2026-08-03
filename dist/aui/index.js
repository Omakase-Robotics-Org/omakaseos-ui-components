import { createContext as e, forwardRef as t, memo as n, useCallback as r, useContext as i, useEffect as a, useLayoutEffect as o, useRef as s, useState as c } from "react";
import { AlertCircleIcon as l, ArrowDownIcon as u, ArrowUpIcon as d, BrainIcon as f, CheckIcon as p, ChevronDownIcon as m, ChevronLeftIcon as h, ChevronRightIcon as g, CopyIcon as _, DownloadIcon as v, FileText as y, LoaderIcon as b, MicIcon as x, MicOffIcon as ee, MoreHorizontalIcon as te, PencilIcon as ne, PhoneIcon as re, PhoneOffIcon as ie, PlusIcon as ae, RefreshCwIcon as oe, SquareIcon as se, XCircleIcon as ce, XIcon as le } from "lucide-react";
import { ActionBarMorePrimitive as S, ActionBarPrimitive as C, AssistantRuntimeProvider as ue, AttachmentPrimitive as de, AuiIf as w, BranchPickerPrimitive as T, ComposerPrimitive as E, ErrorPrimitive as fe, MessagePrimitive as D, ReadonlyThreadProvider as pe, SuggestionPrimitive as me, ThreadPrimitive as O, fromThreadMessageLike as he, groupPartByType as ge, useAui as _e, useAuiState as k, useLocalRuntime as ve, useScrollLock as ye, useToolCallElapsed as be, useVoiceControls as xe, useVoiceState as Se, useVoiceVolume as Ce } from "@assistant-ui/react";
import { useShallow as we } from "zustand/shallow";
import { Avatar as Te, Collapsible as Ee, Dialog as A, Slot as De, Tooltip as j } from "radix-ui";
import { clsx as Oe } from "clsx";
import { jsx as M, jsxs as N } from "react/jsx-runtime";
import { cva as ke } from "class-variance-authority";
import { MarkdownTextPrimitive as Ae, unstable_memoizeMarkdownComponents as je, useIsMarkdownCodeBlock as Me } from "@assistant-ui/react-markdown";
import Ne from "remark-gfm";
//#region src/aui/lib/cn.ts
function P(...e) {
	return Oe(e);
}
var Pe = {
	tooltipContent: "_tooltipContent_bi4w5_9",
	tooltipArrow: "_tooltipArrow_bi4w5_23"
};
//#endregion
//#region src/aui/ui/tooltip.tsx
function Fe({ delayDuration: e = 0, ...t }) {
	return /* @__PURE__ */ M(j.Provider, {
		"data-slot": "tooltip-provider",
		delayDuration: e,
		...t
	});
}
function Ie({ ...e }) {
	return /* @__PURE__ */ M(j.Root, {
		"data-slot": "tooltip",
		...e
	});
}
function Le({ ...e }) {
	return /* @__PURE__ */ M(j.Trigger, {
		"data-slot": "tooltip-trigger",
		...e
	});
}
function Re({ className: e, sideOffset: t = 0, children: n, ...r }) {
	return /* @__PURE__ */ M(j.Portal, { children: /* @__PURE__ */ N(j.Content, {
		"data-slot": "tooltip-content",
		sideOffset: t,
		className: P(Pe.tooltipContent, e),
		...r,
		children: [n, /* @__PURE__ */ M(j.Arrow, { className: Pe.tooltipArrow })]
	}) });
}
var F = {
	button: "_button_v7fqk_21",
	variantDefault: "_variantDefault_v7fqk_92",
	variantDestructive: "_variantDestructive_v7fqk_100",
	variantOutline: "_variantOutline_v7fqk_122",
	variantSecondary: "_variantSecondary_v7fqk_150",
	variantGhost: "_variantGhost_v7fqk_158",
	variantLink: "_variantLink_v7fqk_166",
	sizeDefault: "_sizeDefault_v7fqk_178",
	sizeXs: "_sizeXs_v7fqk_80",
	sizeSm: "_sizeSm_v7fqk_203",
	sizeLg: "_sizeLg_v7fqk_212",
	sizeIcon: "_sizeIcon_v7fqk_80",
	sizeIconXs: "_sizeIconXs_v7fqk_80",
	sizeIconSm: "_sizeIconSm_v7fqk_235",
	sizeIconLg: "_sizeIconLg_v7fqk_240"
}, ze = ke(F.button, {
	variants: {
		variant: {
			default: F.variantDefault,
			destructive: F.variantDestructive,
			outline: F.variantOutline,
			secondary: F.variantSecondary,
			ghost: F.variantGhost,
			link: F.variantLink
		},
		size: {
			default: F.sizeDefault,
			xs: F.sizeXs,
			sm: F.sizeSm,
			lg: F.sizeLg,
			icon: F.sizeIcon,
			"icon-xs": F.sizeIconXs,
			"icon-sm": F.sizeIconSm,
			"icon-lg": F.sizeIconLg
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
		className: P(ze({
			variant: t,
			size: n,
			className: e
		})),
		...i
	});
}
var L = {
	dialogOverlay: "_dialogOverlay_138n7_11",
	dialogContent: "_dialogContent_138n7_18",
	dialogClose: "_dialogClose_138n7_53",
	dialogHeader: "_dialogHeader_138n7_104",
	dialogFooter: "_dialogFooter_138n7_116",
	dialogTitle: "_dialogTitle_138n7_128",
	dialogDescription: "_dialogDescription_138n7_134",
	srOnly: "_srOnly_138n7_142"
};
//#endregion
//#region src/aui/ui/dialog.tsx
function Be({ ...e }) {
	return /* @__PURE__ */ M(A.Root, {
		"data-slot": "dialog",
		...e
	});
}
function Ve({ ...e }) {
	return /* @__PURE__ */ M(A.Trigger, {
		"data-slot": "dialog-trigger",
		...e
	});
}
function He({ ...e }) {
	return /* @__PURE__ */ M(A.Portal, {
		"data-slot": "dialog-portal",
		...e
	});
}
function Ue({ ...e }) {
	return /* @__PURE__ */ M(A.Close, {
		"data-slot": "dialog-close",
		...e
	});
}
function We({ className: e, ...t }) {
	return /* @__PURE__ */ M(A.Overlay, {
		"data-slot": "dialog-overlay",
		className: P(L.dialogOverlay, e),
		...t
	});
}
function Ge({ className: e, children: t, showCloseButton: n = !0, ...r }) {
	return /* @__PURE__ */ N(He, {
		"data-slot": "dialog-portal",
		children: [/* @__PURE__ */ M(We, {}), /* @__PURE__ */ N(A.Content, {
			"data-slot": "dialog-content",
			className: P(L.dialogContent, e),
			...r,
			children: [t, n && /* @__PURE__ */ N(A.Close, {
				"data-slot": "dialog-close",
				className: L.dialogClose,
				children: [/* @__PURE__ */ M(le, {}), /* @__PURE__ */ M("span", {
					className: L.srOnly,
					children: "Close"
				})]
			})]
		})]
	});
}
function Ke({ className: e, ...t }) {
	return /* @__PURE__ */ M("div", {
		"data-slot": "dialog-header",
		className: P(L.dialogHeader, e),
		...t
	});
}
function qe({ className: e, showCloseButton: t = !1, children: n, ...r }) {
	return /* @__PURE__ */ N("div", {
		"data-slot": "dialog-footer",
		className: P(L.dialogFooter, e),
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
function Je({ className: e, ...t }) {
	return /* @__PURE__ */ M(A.Title, {
		"data-slot": "dialog-title",
		className: P(L.dialogTitle, e),
		...t
	});
}
function Ye({ className: e, ...t }) {
	return /* @__PURE__ */ M(A.Description, {
		"data-slot": "dialog-description",
		className: P(L.dialogDescription, e),
		...t
	});
}
var Xe = {
	avatarRoot: "_avatarRoot_1epso_17",
	avatarImage: "_avatarImage_1epso_37",
	avatarFallback: "_avatarFallback_1epso_43",
	avatarBadge: "_avatarBadge_1epso_60",
	avatarGroupRoot: "_avatarGroupRoot_1epso_111",
	avatarGroupCount: "_avatarGroupCount_1epso_132"
};
//#endregion
//#region src/aui/ui/avatar.tsx
function Ze({ className: e, size: t = "default", ...n }) {
	return /* @__PURE__ */ M(Te.Root, {
		"data-slot": "avatar",
		"data-size": t,
		className: P(Xe.avatarRoot, e),
		...n
	});
}
function Qe({ className: e, ...t }) {
	return /* @__PURE__ */ M(Te.Image, {
		"data-slot": "avatar-image",
		className: P(Xe.avatarImage, e),
		...t
	});
}
function $e({ className: e, ...t }) {
	return /* @__PURE__ */ M(Te.Fallback, {
		"data-slot": "avatar-fallback",
		className: P(Xe.avatarFallback, e),
		...t
	});
}
var et = {
	iconButton: "_iconButton_9rdbd_12",
	srOnly: "_srOnly_9rdbd_26"
}, R = t(({ children: e, tooltip: t, side: n = "bottom", className: r, ...i }, a) => /* @__PURE__ */ M(Fe, {
	delayDuration: 0,
	children: /* @__PURE__ */ N(Ie, { children: [/* @__PURE__ */ M(Le, {
		asChild: !0,
		children: /* @__PURE__ */ N(I, {
			variant: "ghost",
			size: "icon",
			...i,
			className: P("aui-button-icon", et.iconButton, r),
			ref: a,
			children: [/* @__PURE__ */ M(De.Slottable, { children: e }), /* @__PURE__ */ M("span", {
				className: P("aui-sr-only", et.srOnly),
				children: t
			})]
		})
	}), /* @__PURE__ */ M(Re, {
		side: n,
		children: t
	})] })
}));
R.displayName = "TooltipIconButton";
var z = {
	preview: "_preview_32906_2",
	invisibleWhileLoading: "_invisibleWhileLoading_32906_12",
	trigger: "_trigger_32906_19",
	dialogContent: "_dialogContent_32906_41",
	srOnly: "_srOnly_32906_80",
	previewWrapper: "_previewWrapper_32906_92",
	tileAvatar: "_tileAvatar_32906_108",
	tileImage: "_tileImage_32906_113",
	tileFallbackIcon: "_tileFallbackIcon_32906_117",
	root: "_root_32906_125",
	rootMessage: "_rootMessage_32906_135",
	tile: "_tile_32906_108",
	tileRemove: "_tileRemove_32906_167",
	removeIcon: "_removeIcon_32906_202",
	userMessageAttachmentsEnd: "_userMessageAttachmentsEnd_32906_218",
	composerAttachments: "_composerAttachments_32906_229",
	composerAddAttachment: "_composerAddAttachment_32906_244",
	addIcon: "_addIcon_32906_272"
}, tt = (e) => {
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
}, nt = () => {
	let { file: e, src: t } = k(we((e) => {
		if (e.attachment.type !== "image") return {};
		if (e.attachment.file) return { file: e.attachment.file };
		let t = e.attachment.content?.filter((e) => e.type === "image")[0]?.image;
		return t ? { src: t } : {};
	}));
	return tt(e) ?? t;
}, rt = ({ src: e }) => {
	let [t, n] = c(!1);
	return /* @__PURE__ */ M("img", {
		src: e,
		alt: "Attachment preview",
		className: P(z.preview, t ? "aui-attachment-preview-image-loaded" : P("aui-attachment-preview-image-loading", z.invisibleWhileLoading)),
		onLoad: () => n(!0)
	});
}, it = ({ children: e }) => {
	let t = nt();
	return t ? /* @__PURE__ */ N(Be, { children: [/* @__PURE__ */ M(Ve, {
		className: P("aui-attachment-preview-trigger", z.trigger),
		asChild: !0,
		children: e
	}), /* @__PURE__ */ N(Ge, {
		className: P("aui-attachment-preview-dialog-content", z.dialogContent),
		children: [/* @__PURE__ */ M(Je, {
			className: P("aui-sr-only", z.srOnly),
			children: "Image Attachment Preview"
		}), /* @__PURE__ */ M("div", {
			className: P("aui-attachment-preview", z.previewWrapper),
			children: /* @__PURE__ */ M(rt, { src: t })
		})]
	})] }) : e;
}, at = () => {
	let e = nt();
	return /* @__PURE__ */ N(Ze, {
		className: P("aui-attachment-tile-avatar", z.tileAvatar),
		children: [/* @__PURE__ */ M(Qe, {
			src: e,
			alt: "Attachment preview",
			className: P("aui-attachment-tile-image", z.tileImage)
		}), /* @__PURE__ */ M($e, { children: /* @__PURE__ */ M(y, { className: P("aui-attachment-tile-fallback-icon", z.tileFallbackIcon) }) })]
	});
}, ot = () => {
	let e = _e().attachment.source !== "message", t = k((e) => e.attachment.type === "image"), n = k((e) => {
		let t = e.attachment.type;
		switch (t) {
			case "image": return "Image";
			case "document": return "Document";
			case "file": return "File";
			default: return t;
		}
	});
	return /* @__PURE__ */ N(Ie, { children: [/* @__PURE__ */ N(de.Root, {
		className: P("aui-attachment-root", z.root, t && !e && P("aui-attachment-root-message", z.rootMessage)),
		children: [/* @__PURE__ */ M(it, { children: /* @__PURE__ */ M(Le, {
			asChild: !0,
			children: /* @__PURE__ */ M("div", {
				className: P("aui-attachment-tile", z.tile),
				role: "button",
				tabIndex: 0,
				"aria-label": `${n} attachment`,
				children: /* @__PURE__ */ M(at, {})
			})
		}) }), e && /* @__PURE__ */ M(st, {})]
	}), /* @__PURE__ */ M(Re, {
		side: "top",
		children: /* @__PURE__ */ M(de.Name, {})
	})] });
}, st = () => /* @__PURE__ */ M(de.Remove, {
	asChild: !0,
	children: /* @__PURE__ */ M(R, {
		tooltip: "Remove file",
		className: P("aui-attachment-tile-remove", z.tileRemove),
		side: "top",
		children: /* @__PURE__ */ M(le, { className: P("aui-attachment-remove-icon", z.removeIcon) })
	})
}), ct = () => /* @__PURE__ */ M("div", {
	className: P("aui-user-message-attachments-end", z.userMessageAttachmentsEnd),
	children: /* @__PURE__ */ M(D.Attachments, { children: () => /* @__PURE__ */ M(ot, {}) })
}), lt = () => /* @__PURE__ */ M("div", {
	className: P("aui-composer-attachments", z.composerAttachments),
	children: /* @__PURE__ */ M(E.Attachments, { children: () => /* @__PURE__ */ M(ot, {}) })
}), ut = () => /* @__PURE__ */ M(E.AddAttachment, {
	asChild: !0,
	children: /* @__PURE__ */ M(R, {
		tooltip: "Add Attachment",
		side: "bottom",
		variant: "ghost",
		size: "icon",
		className: P("aui-composer-add-attachment", z.composerAddAttachment),
		"aria-label": "Add Attachment",
		children: /* @__PURE__ */ M(ae, { className: P("aui-attachment-add-icon", z.addIcon) })
	})
}), B = {
	codeHeaderRoot: "_codeHeaderRoot_1cing_3",
	codeHeaderLanguage: "_codeHeaderLanguage_1cing_24",
	h1: "_h1_1cing_40",
	h2: "_h2_1cing_56",
	h3: "_h3_1cing_72",
	h4: "_h4_1cing_88",
	h5: "_h5_1cing_104",
	h6: "_h6_1cing_119",
	p: "_p_1cing_134",
	a: "_a_1cing_146",
	blockquote: "_blockquote_1cing_158",
	ul: "_ul_1cing_168",
	ol: "_ol_1cing_183",
	hr: "_hr_1cing_198",
	table: "_table_1cing_204",
	th: "_th_1cing_214",
	td: "_td_1cing_235",
	tr: "_tr_1cing_257",
	li: "_li_1cing_274",
	strong: "_strong_1cing_279",
	sup: "_sup_1cing_284",
	pre: "_pre_1cing_290",
	inlineCode: "_inlineCode_1cing_312"
}, dt = n(() => /* @__PURE__ */ M(Ae, {
	remarkPlugins: [Ne],
	className: "aui-md",
	components: mt,
	defer: !0
})), ft = ({ language: e, code: t }) => {
	let { isCopied: n, copyToClipboard: r } = pt();
	return /* @__PURE__ */ N("div", {
		className: P("aui-code-header-root", B.codeHeaderRoot),
		children: [/* @__PURE__ */ M("span", {
			className: P("aui-code-header-language", B.codeHeaderLanguage),
			children: e
		}), /* @__PURE__ */ N(R, {
			tooltip: "Copy",
			onClick: () => {
				!t || n || r(t);
			},
			children: [!n && /* @__PURE__ */ M(_, {}), n && /* @__PURE__ */ M(p, {})]
		})]
	});
}, pt = ({ copiedDuration: e = 3e3 } = {}) => {
	let [t, n] = c(!1);
	return {
		isCopied: t,
		copyToClipboard: (t) => {
			!t || typeof navigator > "u" || !navigator.clipboard || navigator.clipboard.writeText(t).then(() => {
				n(!0), setTimeout(() => n(!1), e);
			}, () => {});
		}
	};
}, mt = je({
	h1: ({ className: e, ...t }) => /* @__PURE__ */ M("h1", {
		className: P("aui-md-h1", B.h1, e),
		...t
	}),
	h2: ({ className: e, ...t }) => /* @__PURE__ */ M("h2", {
		className: P("aui-md-h2", B.h2, e),
		...t
	}),
	h3: ({ className: e, ...t }) => /* @__PURE__ */ M("h3", {
		className: P("aui-md-h3", B.h3, e),
		...t
	}),
	h4: ({ className: e, ...t }) => /* @__PURE__ */ M("h4", {
		className: P("aui-md-h4", B.h4, e),
		...t
	}),
	h5: ({ className: e, ...t }) => /* @__PURE__ */ M("h5", {
		className: P("aui-md-h5", B.h5, e),
		...t
	}),
	h6: ({ className: e, ...t }) => /* @__PURE__ */ M("h6", {
		className: P("aui-md-h6", B.h6, e),
		...t
	}),
	p: ({ className: e, ...t }) => /* @__PURE__ */ M("p", {
		className: P("aui-md-p", B.p, e),
		...t
	}),
	a: ({ className: e, ...t }) => /* @__PURE__ */ M("a", {
		className: P("aui-md-a", B.a, e),
		...t
	}),
	blockquote: ({ className: e, ...t }) => /* @__PURE__ */ M("blockquote", {
		className: P("aui-md-blockquote", B.blockquote, e),
		...t
	}),
	ul: ({ className: e, ...t }) => /* @__PURE__ */ M("ul", {
		className: P("aui-md-ul", B.ul, e),
		...t
	}),
	ol: ({ className: e, ...t }) => /* @__PURE__ */ M("ol", {
		className: P("aui-md-ol", B.ol, e),
		...t
	}),
	hr: ({ className: e, ...t }) => /* @__PURE__ */ M("hr", {
		className: P("aui-md-hr", B.hr, e),
		...t
	}),
	table: ({ className: e, ...t }) => /* @__PURE__ */ M("table", {
		className: P("aui-md-table", B.table, e),
		...t
	}),
	th: ({ className: e, ...t }) => /* @__PURE__ */ M("th", {
		className: P("aui-md-th", B.th, e),
		...t
	}),
	td: ({ className: e, ...t }) => /* @__PURE__ */ M("td", {
		className: P("aui-md-td", B.td, e),
		...t
	}),
	tr: ({ className: e, ...t }) => /* @__PURE__ */ M("tr", {
		className: P("aui-md-tr", B.tr, e),
		...t
	}),
	li: ({ className: e, ...t }) => /* @__PURE__ */ M("li", {
		className: P("aui-md-li", B.li, e),
		...t
	}),
	strong: ({ className: e, ...t }) => /* @__PURE__ */ M("strong", {
		className: P("aui-md-strong", B.strong, e),
		...t
	}),
	sup: ({ className: e, ...t }) => /* @__PURE__ */ M("sup", {
		className: P("aui-md-sup", B.sup, e),
		...t
	}),
	pre: ({ className: e, ...t }) => /* @__PURE__ */ M("pre", {
		className: P("aui-md-pre", B.pre, e),
		...t
	}),
	code: function({ className: e, ...t }) {
		return /* @__PURE__ */ M("code", {
			className: P(!Me() && P("aui-md-inline-code", B.inlineCode), e),
			...t
		});
	},
	CodeHeader: ft
});
//#endregion
//#region src/aui/ui/collapsible.tsx
function V({ ...e }) {
	return /* @__PURE__ */ M(Ee.Root, {
		"data-slot": "collapsible",
		...e
	});
}
function H({ ...e }) {
	return /* @__PURE__ */ M(Ee.CollapsibleTrigger, {
		"data-slot": "collapsible-trigger",
		...e
	});
}
function U({ ...e }) {
	return /* @__PURE__ */ M(Ee.CollapsibleContent, {
		"data-slot": "collapsible-content",
		...e
	});
}
var W = {
	root: "_root_1tguv_32",
	rootOutline: "_rootOutline_1tguv_38",
	rootMuted: "_rootMuted_1tguv_46",
	trigger: "_trigger_1tguv_7",
	triggerIcon: "_triggerIcon_1tguv_75",
	labelWrapper: "_labelWrapper_1tguv_81",
	shimmer: "_shimmer_1tguv_8",
	chevron: "_chevron_1tguv_8",
	content: "_content_1tguv_8",
	fadeTop: "_fadeTop_1tguv_131",
	fadeBottom: "_fadeBottom_1tguv_132",
	text: "_text_1tguv_169",
	textContent: "_textContent_1tguv_189"
}, ht = 200, gt = e(!1), _t = ke(W.root, {
	variants: { variant: {
		outline: W.rootOutline,
		ghost: "",
		muted: W.rootMuted
	} },
	defaultVariants: { variant: "outline" }
});
function G({ className: e, variant: t, open: n, onOpenChange: i, defaultOpen: a = !1, streaming: l, children: u, ...d }) {
	let f = s(null), p = s(a), [m, h] = c(null), g = ye(f, ht), _ = n !== void 0, v = _ ? n : m ?? l ?? p.current, y = l === !0 && v && (_ || m === null), b = s(l);
	return o(() => {
		b.current !== l && (b.current = l, !_ && m === null && g());
	}, [
		l,
		_,
		m,
		g
	]), /* @__PURE__ */ M(V, {
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
		className: P("aui-reasoning-root", _t({
			variant: t,
			className: e
		})),
		style: { "--animation-duration": `${ht}ms` },
		...d,
		children: /* @__PURE__ */ M(gt.Provider, {
			value: y,
			children: u
		})
	});
}
function vt({ side: e = "bottom", className: t, ...n }) {
	return /* @__PURE__ */ M("div", {
		"data-slot": "reasoning-fade",
		className: P("aui-reasoning-fade", e === "top" ? W.fadeTop : W.fadeBottom, t),
		...n
	});
}
function yt({ active: e, duration: t, className: n, ...r }) {
	let i = t ? ` (${t}s)` : "";
	return /* @__PURE__ */ N(H, {
		"data-slot": "reasoning-trigger",
		className: P("aui-reasoning-trigger", W.trigger, n),
		...r,
		children: [
			/* @__PURE__ */ M(f, {
				"data-slot": "reasoning-trigger-icon",
				className: P("aui-reasoning-trigger-icon", W.triggerIcon)
			}),
			/* @__PURE__ */ N("span", {
				"data-slot": "reasoning-trigger-label",
				className: P("aui-reasoning-trigger-label-wrapper", W.labelWrapper),
				children: [/* @__PURE__ */ N("span", { children: ["Reasoning", i] }), e ? /* @__PURE__ */ N("span", {
					"aria-hidden": !0,
					"data-slot": "reasoning-trigger-shimmer",
					className: P("aui-reasoning-trigger-shimmer", W.shimmer),
					children: ["Reasoning", i]
				}) : null]
			}),
			/* @__PURE__ */ M(m, {
				"data-slot": "reasoning-trigger-chevron",
				className: P("aui-reasoning-trigger-chevron", W.chevron)
			})
		]
	});
}
function bt({ className: e, children: t, ...n }) {
	let r = i(gt);
	return /* @__PURE__ */ N(U, {
		"data-slot": "reasoning-content",
		className: P("aui-reasoning-content", W.content, e),
		...n,
		children: [
			r ? /* @__PURE__ */ M(vt, { side: "top" }) : null,
			t,
			/* @__PURE__ */ M(vt, {})
		]
	});
}
function xt({ className: e, children: t, ...n }) {
	let r = i(gt), o = s(null), c = s(null);
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
		className: P("aui-reasoning-text", W.text, e),
		...n,
		children: /* @__PURE__ */ M("div", {
			ref: c,
			className: P("aui-reasoning-text-content", W.textContent),
			children: t
		})
	});
}
var St = () => /* @__PURE__ */ M(dt, {}), Ct = ({ children: e, startIndex: t, endIndex: n }) => {
	let r = k((e) => {
		if (e.message.status?.type !== "running") return !1;
		let r = e.message.parts.length - 1;
		return r < 0 || e.message.parts[r]?.type !== "reasoning" ? !1 : r >= t && r <= n;
	});
	return /* @__PURE__ */ N(G, {
		streaming: r,
		children: [/* @__PURE__ */ M(yt, { active: r }), /* @__PURE__ */ M(bt, {
			"aria-busy": r,
			children: /* @__PURE__ */ M(xt, { children: e })
		})]
	});
}, K = n(St);
K.displayName = "Reasoning", K.Root = G, K.Trigger = yt, K.Content = bt, K.Text = xt, K.Fade = vt;
var wt = n(Ct);
wt.displayName = "ReasoningGroup";
var q = {
	root: "_root_1p3lr_21",
	trigger: "_trigger_1p3lr_25",
	triggerIcon: "_triggerIcon_1p3lr_47",
	triggerIconCancelled: "_triggerIconCancelled_1p3lr_53",
	triggerIconRunning: "_triggerIconRunning_1p3lr_57",
	duration: "_duration_1p3lr_64",
	labelWrapper: "_labelWrapper_1p3lr_71",
	labelWrapperCancelled: "_labelWrapperCancelled_1p3lr_78",
	shimmer: "_shimmer_1p3lr_85",
	chevron: "_chevron_1p3lr_91",
	content: "_content_1p3lr_105",
	contentInner: "_contentInner_1p3lr_119",
	argsCancelled: "_argsCancelled_1p3lr_128",
	argsValue: "_argsValue_1p3lr_132",
	resultHeader: "_resultHeader_1p3lr_142",
	resultContent: "_resultContent_1p3lr_149",
	errorHeader: "_errorHeader_1p3lr_160",
	errorReason: "_errorReason_1p3lr_165",
	approval: "_approval_1p3lr_169",
	approvalWrap: "_approvalWrap_1p3lr_178",
	approvalConfirm: "_approvalConfirm_1p3lr_182",
	approvalConfirmTitle: "_approvalConfirmTitle_1p3lr_189",
	approvalConfirmDescription: "_approvalConfirmDescription_1p3lr_193",
	approvalConfirmGrants: "_approvalConfirmGrants_1p3lr_197",
	approvalConfirmGrant: "_approvalConfirmGrant_1p3lr_197",
	approvalConfirmActions: "_approvalConfirmActions_1p3lr_212"
}, Tt = 200;
function Et({ className: e, open: t, onOpenChange: n, defaultOpen: i = !1, children: a, ...o }) {
	let l = s(null), [u, d] = c(i), f = ye(l, Tt), p = t !== void 0;
	return /* @__PURE__ */ M(V, {
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
		className: P("aui-tool-fallback-root", q.root, e),
		style: { "--animation-duration": `${Tt}ms` },
		...o,
		children: a
	});
}
var Dt = {
	running: b,
	complete: p,
	incomplete: ce,
	"requires-action": l
}, Ot = (e) => {
	if (e < 1e3) return "<1s";
	let t = e / 1e3;
	return t < 10 ? `${(Math.floor(t * 10) / 10).toFixed(1)}s` : t < 60 ? `${Math.floor(t)}s` : `${Math.floor(t / 60)}m ${Math.floor(t % 60)}s`;
};
function kt({ className: e, ...t }) {
	let n = be();
	return n === void 0 ? null : /* @__PURE__ */ M("span", {
		"data-slot": "tool-fallback-duration",
		className: P("aui-tool-fallback-duration", q.duration, e),
		...t,
		children: Ot(n)
	});
}
function At({ toolName: e, status: t, className: n, ...r }) {
	let i = t?.type ?? "complete", a = i === "running", o = t?.type === "incomplete" && t.reason === "cancelled", s = Dt[i], c = o ? "Cancelled tool" : "Used tool";
	return /* @__PURE__ */ N(H, {
		"data-slot": "tool-fallback-trigger",
		className: P("aui-tool-fallback-trigger", q.trigger, n),
		...r,
		children: [
			/* @__PURE__ */ M(s, {
				"data-slot": "tool-fallback-trigger-icon",
				className: P("aui-tool-fallback-trigger-icon", q.triggerIcon, o && q.triggerIconCancelled, a && q.triggerIconRunning)
			}),
			/* @__PURE__ */ N("span", {
				"data-slot": "tool-fallback-trigger-label",
				className: P("aui-tool-fallback-trigger-label-wrapper", q.labelWrapper, o && q.labelWrapperCancelled),
				children: [/* @__PURE__ */ N("span", { children: [
					c,
					": ",
					/* @__PURE__ */ M("b", { children: e })
				] }), a && /* @__PURE__ */ N("span", {
					"aria-hidden": !0,
					"data-slot": "tool-fallback-trigger-shimmer",
					className: P("aui-tool-fallback-trigger-shimmer", q.shimmer),
					children: [
						c,
						": ",
						/* @__PURE__ */ M("b", { children: e })
					]
				})]
			}),
			/* @__PURE__ */ M(kt, {}),
			/* @__PURE__ */ M(m, {
				"data-slot": "tool-fallback-trigger-chevron",
				className: P("aui-tool-fallback-trigger-chevron", q.chevron)
			})
		]
	});
}
function jt({ className: e, children: t, ...n }) {
	return /* @__PURE__ */ M(U, {
		"data-slot": "tool-fallback-content",
		className: P("aui-tool-fallback-content", q.content, e),
		...n,
		children: /* @__PURE__ */ M("div", {
			className: q.contentInner,
			children: t
		})
	});
}
function Mt({ argsText: e, className: t, ...n }) {
	return e ? /* @__PURE__ */ M("div", {
		"data-slot": "tool-fallback-args",
		className: P("aui-tool-fallback-args", t),
		...n,
		children: /* @__PURE__ */ M("pre", {
			className: P("aui-tool-fallback-args-value", q.argsValue),
			children: e
		})
	}) : null;
}
function Nt({ result: e, className: t, ...n }) {
	return e === void 0 ? null : /* @__PURE__ */ N("div", {
		"data-slot": "tool-fallback-result",
		className: P("aui-tool-fallback-result", t),
		...n,
		children: [/* @__PURE__ */ M("p", {
			className: P("aui-tool-fallback-result-header", q.resultHeader),
			children: "Result:"
		}), /* @__PURE__ */ M("pre", {
			className: P("aui-tool-fallback-result-content", q.resultContent),
			children: typeof e == "string" ? e : JSON.stringify(e, null, 2)
		})]
	});
}
function Pt({ status: e, className: t, ...n }) {
	if (e?.type !== "incomplete") return null;
	let r = e.error, i = r ? typeof r == "string" ? r : JSON.stringify(r) : null;
	if (!i) return null;
	let a = e.reason === "cancelled" ? "Cancelled reason:" : "Error:";
	return /* @__PURE__ */ N("div", {
		"data-slot": "tool-fallback-error",
		className: P("aui-tool-fallback-error", t),
		...n,
		children: [/* @__PURE__ */ M("p", {
			className: P("aui-tool-fallback-error-header", q.errorHeader),
			children: a
		}), /* @__PURE__ */ M("p", {
			className: P("aui-tool-fallback-error-reason", q.errorReason),
			children: i
		})]
	});
}
var Ft = "Approved by user", It = "User denied tool execution", Lt = {
	"allow-once": "Allow",
	"allow-always": "Always allow",
	"reject-once": "Deny",
	"reject-always": "Always deny"
}, Rt = (e) => e === "allow-once" || e === "allow-always", zt = (e) => e.label ?? (Object.hasOwn(Lt, e.kind) ? Lt[e.kind] : void 0) ?? e.id;
function Bt({ className: e, addResult: t, resume: n, interrupt: r, approval: i, respondToApproval: a, ...o }) {
	let [s, l] = c(!1), [u, d] = c(null);
	if (i != null && (i.approved !== void 0 || i.resolution !== void 0)) return null;
	let f = a ? i?.options : void 0, p = f?.filter((e) => Object.hasOwn(Lt, e.kind)), m = (e) => {
		s || (i != null && i.approved === void 0 && a ? a({ approved: e }) : r ? n?.({ approved: e }) : t?.(e ? Ft : It), l(!0));
	}, h = (e) => {
		s || (a?.({ optionId: e.id }), l(!0), d(null));
	}, g = (e) => {
		e.confirm ? d(e.id) : h(e);
	}, _ = u == null ? void 0 : p?.find((e) => e.id === u);
	if (_) {
		let t = typeof _.confirm == "object" ? _.confirm : void 0, n = t?.description ?? _.description;
		return /* @__PURE__ */ N("div", {
			"data-slot": "tool-fallback-approval-confirm",
			className: P("aui-tool-fallback-approval-confirm", q.approvalConfirm, e),
			...o,
			children: [
				/* @__PURE__ */ M("p", {
					className: P("aui-tool-fallback-approval-confirm-title", q.approvalConfirmTitle),
					children: t?.title ?? `${zt(_)}?`
				}),
				n && /* @__PURE__ */ M("p", {
					className: P("aui-tool-fallback-approval-confirm-description", q.approvalConfirmDescription),
					children: n
				}),
				_.grants && _.grants.length > 0 && /* @__PURE__ */ M("ul", {
					className: P("aui-tool-fallback-approval-confirm-grants", q.approvalConfirmGrants),
					children: _.grants.map((e) => /* @__PURE__ */ M("li", { children: /* @__PURE__ */ M("code", {
						className: P("aui-tool-fallback-approval-confirm-grant", q.approvalConfirmGrant),
						children: e
					}) }, e))
				}),
				/* @__PURE__ */ N("div", {
					className: q.approvalConfirmActions,
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
		let t = p?.filter((e) => Rt(e.kind)) ?? [], n = p?.filter((e) => !Rt(e.kind)) ?? [];
		return /* @__PURE__ */ N("div", {
			"data-slot": "tool-fallback-approval",
			className: P("aui-tool-fallback-approval", q.approval, q.approvalWrap, e),
			...o,
			children: [[...t, ...n].map((e) => /* @__PURE__ */ M(I, {
				size: "sm",
				variant: e === t[0] ? "default" : "outline",
				onClick: () => g(e),
				disabled: s,
				children: zt(e)
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
		className: P("aui-tool-fallback-approval", q.approval, e),
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
var J = n(({ toolName: e, argsText: t, result: n, status: r, addResult: i, resume: a, interrupt: o, approval: s, respondToApproval: l }) => {
	let u = r?.type === "incomplete" && r.reason === "cancelled", d = r?.type === "requires-action", [f, p] = c(d), [m, h] = c(d);
	return d !== m && (h(d), d && p(!0)), /* @__PURE__ */ N(Et, {
		open: f,
		onOpenChange: p,
		children: [/* @__PURE__ */ M(At, {
			toolName: e,
			status: r
		}), /* @__PURE__ */ N(jt, { children: [
			/* @__PURE__ */ M(Pt, { status: r }),
			/* @__PURE__ */ M(Mt, {
				argsText: t,
				className: P(u && q.argsCancelled)
			}),
			d && /* @__PURE__ */ M(Bt, {
				addResult: i,
				resume: a,
				interrupt: o,
				approval: s,
				respondToApproval: l
			}),
			!u && /* @__PURE__ */ M(Nt, { result: n })
		] })]
	});
});
J.displayName = "ToolFallback", J.Root = Et, J.Trigger = At, J.Content = jt, J.Args = Mt, J.Result = Nt, J.Error = Pt, J.Approval = Bt;
var Y = {
	root: "_root_d5v1z_13",
	rootOutline: "_rootOutline_d5v1z_21",
	rootMuted: "_rootMuted_d5v1z_28",
	trigger: "_trigger_d5v1z_37",
	triggerLoader: "_triggerLoader_d5v1z_67",
	labelWrapper: "_labelWrapper_d5v1z_77",
	shimmer: "_shimmer_d5v1z_96",
	chevron: "_chevron_d5v1z_102",
	content: "_content_d5v1z_116",
	contentInner: "_contentInner_d5v1z_130"
}, Vt = 200, Ht = ke(Y.root, {
	variants: { variant: {
		outline: Y.rootOutline,
		ghost: "",
		muted: Y.rootMuted
	} },
	defaultVariants: { variant: "outline" }
});
function Ut({ className: e, variant: t, open: n, onOpenChange: i, defaultOpen: a = !1, children: o, ...l }) {
	let u = s(null), [d, f] = c(a), p = ye(u, Vt), m = n !== void 0, h = m ? n : d, g = r((e) => {
		p(), m || f(e), i?.(e);
	}, [
		p,
		m,
		i
	]);
	return /* @__PURE__ */ M(V, {
		ref: u,
		"data-slot": "tool-group-root",
		"data-variant": t ?? "outline",
		open: h,
		onOpenChange: g,
		className: P("aui-tool-group-root", Ht({
			variant: t,
			className: e
		})),
		style: { "--animation-duration": `${Vt}ms` },
		...l,
		children: o
	});
}
function X({ count: e, active: t = !1, className: n, ...r }) {
	let i = `${e} tool ${e === 1 ? "call" : "calls"}`;
	return /* @__PURE__ */ N(H, {
		"data-slot": "tool-group-trigger",
		className: P("aui-tool-group-trigger", Y.trigger, n),
		...r,
		children: [
			t && /* @__PURE__ */ M(b, {
				"data-slot": "tool-group-trigger-loader",
				className: P("aui-tool-group-trigger-loader", Y.triggerLoader)
			}),
			/* @__PURE__ */ N("span", {
				"data-slot": "tool-group-trigger-label",
				className: P("aui-tool-group-trigger-label-wrapper", Y.labelWrapper),
				children: [/* @__PURE__ */ M("span", { children: i }), t && /* @__PURE__ */ M("span", {
					"aria-hidden": !0,
					"data-slot": "tool-group-trigger-shimmer",
					className: P("aui-tool-group-trigger-shimmer", Y.shimmer),
					children: i
				})]
			}),
			/* @__PURE__ */ M(m, {
				"data-slot": "tool-group-trigger-chevron",
				className: P("aui-tool-group-trigger-chevron", Y.chevron)
			})
		]
	});
}
function Wt({ className: e, children: t, ...n }) {
	return /* @__PURE__ */ M(U, {
		"data-slot": "tool-group-content",
		className: P("aui-tool-group-content", Y.content, e),
		...n,
		children: /* @__PURE__ */ M("div", {
			className: Y.contentInner,
			children: t
		})
	});
}
var Gt = n(({ children: e, startIndex: t, endIndex: n }) => /* @__PURE__ */ N(Ut, { children: [/* @__PURE__ */ M(X, { count: n - t + 1 }), /* @__PURE__ */ M(Wt, { children: e })] }));
Gt.displayName = "ToolGroup", Gt.Root = Ut, Gt.Trigger = X, Gt.Content = Wt;
var Z = {
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
}, Kt = {}, qt = e(Kt), Jt = (e) => e.thread.messages.length === 0 && (!e.thread.isLoading || e.threads.isLoading), Yt = ({ components: e = Kt }) => {
	let t = k(Jt);
	return /* @__PURE__ */ M(qt.Provider, {
		value: e,
		children: /* @__PURE__ */ M(Xt, { isEmpty: t })
	});
}, Xt = ({ isEmpty: e }) => {
	let { Welcome: t = $t } = i(qt);
	return /* @__PURE__ */ M(O.Root, {
		className: P("aui-root aui-thread-root", Z.root),
		style: {
			"--thread-max-width": "44rem",
			"--composer-bg": "color-mix(in oklab, var(--color-muted) 30%, var(--color-background))",
			"--composer-radius": "1.5rem",
			"--composer-padding": "8px"
		},
		children: /* @__PURE__ */ M(O.Viewport, {
			turnAnchor: "top",
			"data-slot": "aui_thread-viewport",
			className: Z.viewport,
			children: /* @__PURE__ */ N("div", {
				className: P(Z.viewportInner, e && Z.viewportInnerCentered),
				children: [
					/* @__PURE__ */ M(w, {
						condition: Jt,
						children: /* @__PURE__ */ M(t, {})
					}),
					/* @__PURE__ */ M("div", {
						"data-slot": "aui_message-group",
						className: Z.messageGroup,
						children: /* @__PURE__ */ M(O.Messages, { children: () => /* @__PURE__ */ M(Zt, {}) })
					}),
					/* @__PURE__ */ N(O.ViewportFooter, {
						className: P("aui-thread-viewport-footer", Z.viewportFooter, !e && Z.viewportFooterDocked),
						children: [
							/* @__PURE__ */ M(Qt, {}),
							/* @__PURE__ */ M(nn, {}),
							/* @__PURE__ */ M(w, {
								condition: (e) => Jt(e) && e.composer.isEmpty,
								children: /* @__PURE__ */ M(en, {})
							})
						]
					})
				]
			})
		})
	});
}, Zt = () => {
	let { AssistantMessage: e = on } = i(qt), t = k((e) => e.message.role);
	return k((e) => e.message.composer.isEditing) ? /* @__PURE__ */ M(un, {}) : M(t === "user" ? cn : e, {});
}, Qt = () => /* @__PURE__ */ M(O.ScrollToBottom, {
	asChild: !0,
	children: /* @__PURE__ */ M(R, {
		tooltip: "Scroll to bottom",
		variant: "outline",
		className: P("aui-thread-scroll-to-bottom", Z.scrollToBottom),
		children: /* @__PURE__ */ M(u, {})
	})
}), $t = () => /* @__PURE__ */ M("div", {
	className: P("aui-thread-welcome-root", Z.welcomeRoot),
	children: /* @__PURE__ */ M("h1", {
		className: P("aui-thread-welcome-message-inner", Z.welcomeHeading),
		children: "How can I help you today?"
	})
}), en = () => /* @__PURE__ */ M("div", {
	className: P("aui-thread-welcome-suggestions", Z.suggestionsRoot),
	children: /* @__PURE__ */ M(O.Suggestions, { children: () => /* @__PURE__ */ M(tn, {}) })
}), tn = () => /* @__PURE__ */ M("div", {
	className: P("aui-thread-welcome-suggestion-display", Z.suggestionItem),
	children: /* @__PURE__ */ M(me.Trigger, {
		send: !0,
		asChild: !0,
		children: /* @__PURE__ */ N(I, {
			variant: "ghost",
			className: P("aui-thread-welcome-suggestion", Z.suggestionButton),
			children: [/* @__PURE__ */ M(me.Title, { className: "aui-thread-welcome-suggestion-text-1" }), /* @__PURE__ */ M(me.Description, { className: P("aui-thread-welcome-suggestion-text-2", Z.suggestionText2) })]
		})
	})
}), nn = () => /* @__PURE__ */ M(E.Root, {
	className: P("aui-composer-root", Z.composerRoot),
	children: /* @__PURE__ */ M(E.AttachmentDropzone, {
		asChild: !0,
		children: /* @__PURE__ */ N("div", {
			"data-slot": "aui_composer-shell",
			className: Z.composerShell,
			children: [
				/* @__PURE__ */ M(lt, {}),
				/* @__PURE__ */ M(E.Input, {
					placeholder: "Send a message...",
					className: P("aui-composer-input", Z.composerInput),
					rows: 1,
					autoFocus: !0,
					"aria-label": "Message input"
				}),
				/* @__PURE__ */ M(rn, {})
			]
		})
	})
}), rn = () => /* @__PURE__ */ N("div", {
	className: P("aui-composer-action-wrapper", Z.composerActionWrapper),
	children: [/* @__PURE__ */ M(ut, {}), /* @__PURE__ */ N("div", {
		className: Z.composerButtonGroup,
		children: [
			/* @__PURE__ */ N(w, {
				condition: (e) => e.thread.capabilities.dictation,
				children: [/* @__PURE__ */ M(w, {
					condition: (e) => e.composer.dictation == null,
					children: /* @__PURE__ */ M(E.Dictate, {
						asChild: !0,
						children: /* @__PURE__ */ M(R, {
							tooltip: "Voice input",
							side: "bottom",
							type: "button",
							variant: "ghost",
							size: "icon",
							className: P("aui-composer-dictate", Z.composerDictate),
							"aria-label": "Start voice input",
							children: /* @__PURE__ */ M(x, { className: P("aui-composer-dictate-icon", Z.dictateIcon) })
						})
					})
				}), /* @__PURE__ */ M(w, {
					condition: (e) => e.composer.dictation != null,
					children: /* @__PURE__ */ M(E.StopDictation, {
						asChild: !0,
						children: /* @__PURE__ */ M(R, {
							tooltip: "Stop dictation",
							side: "bottom",
							type: "button",
							variant: "ghost",
							size: "icon",
							className: P("aui-composer-stop-dictation", Z.composerStopDictation),
							"aria-label": "Stop voice input",
							children: /* @__PURE__ */ M(se, { className: P("aui-composer-stop-dictation-icon", Z.stopDictationIcon) })
						})
					})
				})]
			}),
			/* @__PURE__ */ M(w, {
				condition: (e) => !e.thread.isRunning,
				children: /* @__PURE__ */ M(E.Send, {
					asChild: !0,
					children: /* @__PURE__ */ M(R, {
						tooltip: "Send message",
						side: "bottom",
						type: "button",
						variant: "default",
						size: "icon",
						className: P("aui-composer-send", Z.composerSend),
						"aria-label": "Send message",
						children: /* @__PURE__ */ M(d, { className: P("aui-composer-send-icon", Z.sendIcon) })
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
						className: P("aui-composer-cancel", Z.composerCancel),
						"aria-label": "Stop generating",
						children: /* @__PURE__ */ M(se, { className: P("aui-composer-cancel-icon", Z.cancelIcon) })
					})
				})
			})
		]
	})]
}), an = () => /* @__PURE__ */ M(D.Error, { children: /* @__PURE__ */ M(fe.Root, {
	className: P("aui-message-error-root", Z.messageErrorRoot),
	children: /* @__PURE__ */ M(fe.Message, { className: P("aui-message-error-message", Z.messageErrorMessage) })
}) }), on = () => {
	let { ToolFallback: e = J, ToolGroup: t, ReasoningGroup: n } = i(qt);
	return /* @__PURE__ */ N(D.Root, {
		"data-slot": "aui_assistant-message-root",
		"data-role": "assistant",
		className: Z.assistantMessageRoot,
		children: [/* @__PURE__ */ N("div", {
			"data-slot": "aui_assistant-message-content",
			className: Z.assistantMessageContent,
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
						}) : /* @__PURE__ */ N(Ut, {
							variant: "ghost",
							children: [/* @__PURE__ */ M(X, {
								count: r.indices.length,
								active: r.status.type === "running"
							}), /* @__PURE__ */ M(Wt, { children: i })]
						});
						case "group-reasoning": {
							if (n) return /* @__PURE__ */ M(n, {
								group: r,
								children: i
							});
							let e = r.status.type === "running";
							return /* @__PURE__ */ N(G, {
								streaming: e,
								children: [/* @__PURE__ */ M(yt, { active: e }), /* @__PURE__ */ M(bt, {
									"aria-busy": e,
									children: /* @__PURE__ */ M(xt, { children: i })
								})]
							});
						}
						case "text": return /* @__PURE__ */ M(dt, {});
						case "reasoning": return /* @__PURE__ */ M(K, { ...r });
						case "tool-call": return r.toolUI ?? /* @__PURE__ */ M(e, { ...r });
						case "data": return r.dataRendererUI;
						case "indicator": return /* @__PURE__ */ M("span", {
							"data-slot": "aui_assistant-message-indicator",
							className: Z.assistantMessageIndicator,
							"aria-label": "Assistant is working",
							children: "●"
						});
						default: return null;
					}
				}
			}), /* @__PURE__ */ M(an, {})]
		}), /* @__PURE__ */ N("div", {
			"data-slot": "aui_assistant-message-footer",
			className: Z.assistantMessageFooter,
			children: [/* @__PURE__ */ M(dn, {}), /* @__PURE__ */ M(sn, {})]
		})]
	});
}, sn = () => /* @__PURE__ */ N(C.Root, {
	hideWhenRunning: !0,
	autohide: "not-last",
	className: P("aui-assistant-action-bar-root", Z.assistantActionBarRoot),
	children: [
		/* @__PURE__ */ M(C.Copy, {
			asChild: !0,
			children: /* @__PURE__ */ N(R, {
				tooltip: "Copy",
				children: [/* @__PURE__ */ M(w, {
					condition: (e) => e.message.isCopied,
					children: /* @__PURE__ */ M(p, {})
				}), /* @__PURE__ */ M(w, {
					condition: (e) => !e.message.isCopied,
					children: /* @__PURE__ */ M(_, {})
				})]
			})
		}),
		/* @__PURE__ */ M(C.Reload, {
			asChild: !0,
			children: /* @__PURE__ */ M(R, {
				tooltip: "Refresh",
				children: /* @__PURE__ */ M(oe, {})
			})
		}),
		/* @__PURE__ */ N(S.Root, { children: [/* @__PURE__ */ M(S.Trigger, {
			asChild: !0,
			children: /* @__PURE__ */ M(R, {
				tooltip: "More",
				children: /* @__PURE__ */ M(te, {})
			})
		}), /* @__PURE__ */ M(S.Content, {
			side: "bottom",
			align: "start",
			sideOffset: 6,
			className: P("aui-action-bar-more-content", Z.actionBarMoreContent),
			children: /* @__PURE__ */ M(C.ExportMarkdown, {
				asChild: !0,
				children: /* @__PURE__ */ N(S.Item, {
					className: P("aui-action-bar-more-item", Z.actionBarMoreItem),
					children: [/* @__PURE__ */ M(v, { className: Z.exportIcon }), "Export as Markdown"]
				})
			})
		})] })
	]
}), cn = () => /* @__PURE__ */ N(D.Root, {
	"data-slot": "aui_user-message-root",
	className: Z.userMessageRoot,
	"data-role": "user",
	children: [
		/* @__PURE__ */ M(ct, {}),
		/* @__PURE__ */ N("div", {
			className: P("aui-user-message-content-wrapper", Z.userMessageContentWrapper),
			children: [/* @__PURE__ */ M("div", {
				className: P("aui-user-message-content", Z.userMessageContent),
				children: /* @__PURE__ */ M(D.Parts, {})
			}), /* @__PURE__ */ M("div", {
				className: P("aui-user-action-bar-wrapper", Z.userActionBarWrapper),
				children: /* @__PURE__ */ M(ln, {})
			})]
		}),
		/* @__PURE__ */ M(dn, {
			"data-slot": "aui_user-branch-picker",
			className: Z.userBranchPicker
		})
	]
}), ln = () => /* @__PURE__ */ M(C.Root, {
	hideWhenRunning: !0,
	autohide: "not-last",
	className: P("aui-user-action-bar-root", Z.userActionBarRoot),
	children: /* @__PURE__ */ M(C.Edit, {
		asChild: !0,
		children: /* @__PURE__ */ M(R, {
			tooltip: "Edit",
			className: "aui-user-action-edit",
			children: /* @__PURE__ */ M(ne, {})
		})
	})
}), un = () => /* @__PURE__ */ M(D.Root, {
	"data-slot": "aui_edit-composer-wrapper",
	className: Z.editComposerWrapper,
	children: /* @__PURE__ */ N(E.Root, {
		className: P("aui-edit-composer-root", Z.editComposerRoot),
		children: [/* @__PURE__ */ M(E.Input, {
			className: P("aui-edit-composer-input", Z.editComposerInput),
			autoFocus: !0
		}), /* @__PURE__ */ N("div", {
			className: P("aui-edit-composer-footer", Z.editComposerFooter),
			children: [/* @__PURE__ */ M(E.Cancel, {
				asChild: !0,
				children: /* @__PURE__ */ M(I, {
					variant: "ghost",
					size: "sm",
					className: Z.editComposerButton,
					children: "Cancel"
				})
			}), /* @__PURE__ */ M(E.Send, {
				asChild: !0,
				children: /* @__PURE__ */ M(I, {
					size: "sm",
					className: Z.editComposerButton,
					children: "Update"
				})
			})]
		})]
	})
}), dn = ({ className: e, ...t }) => /* @__PURE__ */ N(T.Root, {
	hideWhenSingleBranch: !0,
	className: P("aui-branch-picker-root", Z.branchPickerRoot, e),
	...t,
	children: [
		/* @__PURE__ */ M(T.Previous, {
			asChild: !0,
			children: /* @__PURE__ */ M(R, {
				tooltip: "Previous",
				children: /* @__PURE__ */ M(h, {})
			})
		}),
		/* @__PURE__ */ N("span", {
			className: P("aui-branch-picker-state", Z.branchPickerState),
			children: [
				/* @__PURE__ */ M(T.Number, {}),
				" / ",
				/* @__PURE__ */ M(T.Count, {})
			]
		}),
		/* @__PURE__ */ M(T.Next, {
			asChild: !0,
			children: /* @__PURE__ */ M(R, {
				tooltip: "Next",
				children: /* @__PURE__ */ M(g, {})
			})
		})
	]
}), Q = {
	voiceControl: "_voiceControl_gr5vv_1",
	voiceStatus: "_voiceStatus_gr5vv_11",
	voiceStatusDot: "_voiceStatusDot_gr5vv_19",
	voiceStatusDotIdle: "_voiceStatusDotIdle_gr5vv_30",
	voiceStatusDotConnecting: "_voiceStatusDotConnecting_gr5vv_34",
	voiceStatusDotActive: "_voiceStatusDotActive_gr5vv_42",
	voiceStatusDotMuted: "_voiceStatusDotMuted_gr5vv_46",
	voiceOrb: "_voiceOrb_gr5vv_51",
	connectButton: "_connectButton_gr5vv_63",
	connectIcon: "_connectIcon_gr5vv_68",
	disconnectButton: "_disconnectButton_gr5vv_79"
}, fn = {
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
}, pn = {
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
}, mn = "#version 300 es\nin vec2 a_position;\nout vec2 v_uv;\nvoid main() {\n  v_uv = a_position * 0.5 + 0.5;\n  gl_Position = vec4(a_position, 0.0, 1.0);\n}", hn = "#version 300 es\nprecision highp float;\n\nin vec2 v_uv;\nout vec4 fragColor;\n\nuniform float u_time;\nuniform float u_speed;\nuniform float u_amplitude;\nuniform float u_glow;\nuniform float u_brightness;\nuniform float u_pulse;\nuniform float u_saturation;\nuniform vec3 u_color0;\nuniform vec3 u_color1;\nuniform vec3 u_color2;\nuniform float u_dpr;\n\n// Simplex-like noise (3D)\nvec3 mod289(vec3 x) { return x - floor(x / 289.0) * 289.0; }\nvec4 mod289(vec4 x) { return x - floor(x / 289.0) * 289.0; }\nvec4 permute(vec4 x) { return mod289((x * 34.0 + 1.0) * x); }\nvec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }\n\nfloat snoise(vec3 v) {\n  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);\n  vec3 i = floor(v + dot(v, vec3(C.y)));\n  vec3 x0 = v - i + dot(i, vec3(C.x));\n  vec3 g = step(x0.yzx, x0.xyz);\n  vec3 l = 1.0 - g;\n  vec3 i1 = min(g, l.zxy);\n  vec3 i2 = max(g, l.zxy);\n  vec3 x1 = x0 - i1 + C.x;\n  vec3 x2 = x0 - i2 + C.y;\n  vec3 x3 = x0 - 0.5;\n  i = mod289(i);\n  vec4 p = permute(permute(permute(\n    i.z + vec4(0.0, i1.z, i2.z, 1.0))\n    + i.y + vec4(0.0, i1.y, i2.y, 1.0))\n    + i.x + vec4(0.0, i1.x, i2.x, 1.0));\n  vec4 j = p - 49.0 * floor(p / 49.0);\n  vec4 x_ = floor(j / 7.0);\n  vec4 y_ = floor(j - 7.0 * x_);\n  vec4 x = (x_ * 2.0 + 0.5) / 7.0 - 1.0;\n  vec4 y = (y_ * 2.0 + 0.5) / 7.0 - 1.0;\n  vec4 h = 1.0 - abs(x) - abs(y);\n  vec4 b0 = vec4(x.xy, y.xy);\n  vec4 b1 = vec4(x.zw, y.zw);\n  vec4 s0 = floor(b0) * 2.0 + 1.0;\n  vec4 s1 = floor(b1) * 2.0 + 1.0;\n  vec4 sh = -step(h, vec4(0.0));\n  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;\n  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;\n  vec3 g0 = vec3(a0.xy, h.x);\n  vec3 g1 = vec3(a0.zw, h.y);\n  vec3 g2 = vec3(a1.xy, h.z);\n  vec3 g3 = vec3(a1.zw, h.w);\n  vec4 norm = taylorInvSqrt(vec4(dot(g0,g0), dot(g1,g1), dot(g2,g2), dot(g3,g3)));\n  g0 *= norm.x; g1 *= norm.y; g2 *= norm.z; g3 *= norm.w;\n  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);\n  m = m * m;\n  return 42.0 * dot(m * m, vec4(dot(g0,x0), dot(g1,x1), dot(g2,x2), dot(g3,x3)));\n}\n\nvoid main() {\n  vec2 uv = v_uv * 2.0 - 1.0;\n  float dist = length(uv);\n  float t = u_time * u_speed;\n\n  // Perfect circle — hard boundary, soft anti-aliased edge\n  float radius = 0.44;\n  float circle = 1.0 - smoothstep(radius - 0.008, radius + 0.008, dist);\n\n  if (circle < 0.001) {\n    // Outer glow only\n    float glowDist = dist - radius;\n    float glow = exp(-glowDist * 12.0) * u_glow * 0.4;\n    vec3 glowColor = mix(u_color0, u_color1, 0.5);\n    fragColor = vec4(glowColor * glow, glow);\n    return;\n  }\n\n  float n1 = snoise(vec3(uv * 2.0, t * 0.6)) * 0.5 + 0.5;\n  float n2 = snoise(vec3(uv * 3.5 + 7.0, t * 0.9)) * 0.5 + 0.5;\n  float n3 = snoise(vec3(uv * 1.5 - 3.0, t * 0.4 + 10.0)) * 0.5 + 0.5;\n\n  vec2 distort = vec2(\n    snoise(vec3(uv * 2.0 + 5.0, t * 0.7)),\n    snoise(vec3(uv * 2.0 + 15.0, t * 0.7))\n  ) * u_amplitude * 2.0;\n  float n4 = snoise(vec3((uv + distort) * 3.0, t * 0.5)) * 0.5 + 0.5;\n\n  vec3 col = mix(u_color0, u_color1, n1);\n  col = mix(col, u_color2, n2 * 0.5);\n  col = mix(col, u_color1 * 1.3, n4 * 0.4);\n\n  float vein = pow(n3, 3.0) * u_amplitude * 6.0;\n  col += vein * mix(u_color1, vec3(1.0), 0.3);\n\n  float centerDist = dist / radius;\n  float depthShade = 1.0 - centerDist * centerDist * 0.4;\n  col *= depthShade;\n\n  float rim = pow(centerDist, 4.0) * 0.6;\n  col += rim * mix(u_color0, vec3(1.0), 0.5);\n\n  vec2 lightPos = vec2(-0.15, -0.18);\n  float specDist = length(uv - lightPos);\n  float spec = exp(-specDist * specDist * 30.0) * 0.7;\n  col += spec * vec3(1.0);\n\n  vec2 lightPos2 = vec2(0.2, 0.25);\n  float spec2 = exp(-length(uv - lightPos2) * 8.0) * 0.15;\n  col += spec2 * u_color1;\n\n  float pulseFactor = 1.0 + u_pulse * sin(u_time * 3.5) * 0.35;\n\n  float lum = dot(col, vec3(0.299, 0.587, 0.114));\n  col = mix(vec3(lum), col, u_saturation);\n\n  col *= u_brightness * pulseFactor;\n\n  fragColor = vec4(col, circle);\n}";
function gn(e, t, n) {
	let r = e.createShader(t);
	return r ? (e.shaderSource(r, n), e.compileShader(r), e.getShaderParameter(r, e.COMPILE_STATUS) ? r : (e.deleteShader(r), null)) : null;
}
function _n(e) {
	let t = e.getContext("webgl2", {
		alpha: !0,
		premultipliedAlpha: !1,
		antialias: !0
	});
	if (!t) return null;
	let n = gn(t, t.VERTEX_SHADER, mn), r = gn(t, t.FRAGMENT_SHADER, hn);
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
function vn(e) {
	return e ? e.status.type === "starting" ? "connecting" : e.status.type === "ended" ? "idle" : e.isMuted ? "muted" : e.mode === "speaking" ? "speaking" : "listening" : "idle";
}
var yn = n(({ state: e, variant: t = "default", className: n }) => {
	let i = Se(), o = e ?? vn(i), l = Ce(), u = s(0);
	u.current = l;
	let d = s(null), f = s(null), p = s(0), m = s(performance.now()), h = s({ ...pn.idle }), g = s({ ...pn.idle });
	a(() => {
		g.current = { ...pn[o] };
	}, [o]);
	let _ = fn[t], [v, y] = c(!1);
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
		if (e && (f.current = _n(e), f.current)) return p.current = requestAnimationFrame(b), () => {
			cancelAnimationFrame(p.current);
			let e = f.current;
			e && e.gl.getExtension("WEBGL_lose_context")?.loseContext(), f.current = null;
		};
	}, [v, b]), /* @__PURE__ */ M("canvas", {
		ref: d,
		className: P("aui-voice-orb", Q.voiceOrb, n),
		"data-state": o
	});
});
yn.displayName = "VoiceOrb";
var bn = ({ className: e }) => /* @__PURE__ */ N("div", {
	className: P("aui-voice-control", Q.voiceControl, e),
	children: [
		/* @__PURE__ */ M(xn, {}),
		/* @__PURE__ */ M(w, {
			condition: (e) => e.thread.voice == null || e.thread.voice.status.type === "ended",
			children: /* @__PURE__ */ M(Sn, {})
		}),
		/* @__PURE__ */ M(w, {
			condition: (e) => e.thread.voice?.status.type === "starting",
			children: /* @__PURE__ */ M("span", {
				className: P("aui-voice-status", Q.voiceStatus),
				children: "Connecting..."
			})
		}),
		/* @__PURE__ */ N(w, {
			condition: (e) => e.thread.voice?.status.type === "running",
			children: [/* @__PURE__ */ M(Cn, {}), /* @__PURE__ */ M(wn, {})]
		})
	]
}), xn = () => {
	let e = vn(Se());
	return /* @__PURE__ */ M("span", { className: P("aui-voice-status-dot", Q.voiceStatusDot, e === "idle" && Q.voiceStatusDotIdle, e === "connecting" && Q.voiceStatusDotConnecting, e === "listening" && Q.voiceStatusDotActive, e === "speaking" && Q.voiceStatusDotActive, e === "muted" && Q.voiceStatusDotMuted) });
}, Sn = () => {
	let { connect: e } = xe();
	return /* @__PURE__ */ N(I, {
		variant: "default",
		size: "sm",
		className: P("aui-voice-connect", Q.connectButton),
		onClick: () => e(),
		children: [/* @__PURE__ */ M(re, { className: Q.connectIcon }), "Connect"]
	});
}, Cn = () => {
	let e = Se(), { mute: t, unmute: n } = xe(), r = e?.isMuted ?? !1;
	return /* @__PURE__ */ M(R, {
		tooltip: r ? "Unmute" : "Mute",
		className: "aui-voice-mute",
		onClick: () => r ? n() : t(),
		children: M(r ? ee : x, {})
	});
}, wn = () => {
	let { disconnect: e } = xe();
	return /* @__PURE__ */ M(R, {
		tooltip: "Disconnect",
		className: P("aui-voice-disconnect", Q.disconnectButton),
		onClick: () => e(),
		children: /* @__PURE__ */ M(ie, {})
	});
};
//#endregion
export { ue as AssistantRuntimeProvider, Ze as Avatar, $e as AvatarFallback, Qe as AvatarImage, I as Button, V as Collapsible, U as CollapsibleContent, H as CollapsibleTrigger, ut as ComposerAddAttachment, lt as ComposerAttachments, Be as Dialog, Ue as DialogClose, Ge as DialogContent, Ye as DialogDescription, qe as DialogFooter, Ke as DialogHeader, We as DialogOverlay, He as DialogPortal, Je as DialogTitle, Ve as DialogTrigger, dt as MarkdownText, pe as ReadonlyThreadProvider, K as Reasoning, bt as ReasoningContent, G as ReasoningRoot, xt as ReasoningText, yt as ReasoningTrigger, Yt as Thread, J as ToolFallback, Wt as ToolGroupContent, Ut as ToolGroupRoot, X as ToolGroupTrigger, Ie as Tooltip, Re as TooltipContent, R as TooltipIconButton, Fe as TooltipProvider, Le as TooltipTrigger, ct as UserMessageAttachments, Sn as VoiceConnectButton, bn as VoiceControl, wn as VoiceDisconnectButton, Cn as VoiceMuteButton, yn as VoiceOrb, xn as VoiceStatusDot, ze as buttonVariants, P as cn, vn as deriveVoiceOrbState, he as fromThreadMessageLike, ve as useLocalRuntime };

//# sourceMappingURL=index.js.map