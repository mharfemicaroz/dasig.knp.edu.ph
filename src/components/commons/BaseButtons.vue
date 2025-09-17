<script setup>
import { h, useSlots, computed } from "vue";

defineOptions({ name: "BaseButtons" });

const props = defineProps({
    noWrap: { type: Boolean, default: false },
    type: { type: String, default: "justify-start" },
    classAddon: { type: String, default: "mr-3 last:mr-0 mb-3" },
    mb: { type: String, default: "-mb-3" },
});

const slots = useSlots();

/**
 * Build the same VNode tree as the original render() function.
 * We return a root VNode and render it via <component :is="rootVNode" /> in the template.
 */
const rootVNode = computed(() => {
    const hasSlot = !!slots.default;

    const parentClass = [
        "flex",
        "items-center",
        props.type,
        props.noWrap ? "flex-nowrap" : "flex-wrap",
    ];

    if (props.mb) parentClass.push(props.mb);

    const children = hasSlot
        ? slots.default().map((element) => {
            // When the child itself has VNode children (array/object),
            // map them and apply classAddon to each
            if (element && element.children && typeof element.children === "object") {
                return h(
                    element,
                    {},
                    element.children.map((child) => h(child, { class: [props.classAddon] })),
                );
            }
            // Otherwise, apply classAddon directly on the element
            return h(element, { class: [props.classAddon] });
        })
        : null;

    return h("div", { class: parentClass }, children);
});
</script>

<template>
    <component :is="rootVNode" />
</template>
