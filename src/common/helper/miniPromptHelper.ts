type PromptIcon = "success" | "none";

interface PromptOptions {
    duration?: number;
    mask?: boolean;
}

class MiniPromptHelper {
    private show(message: string, icon: PromptIcon, fallback: string, options?: PromptOptions): void {
        const title = (message || "").trim() || fallback;
        uni.showToast({
            title,
            icon,
            duration: options?.duration ?? 2000,
            mask: options?.mask ?? false,
        });
    }

    success(message: string = "操作成功", options?: PromptOptions): void {
        this.show(message, "success", "操作成功", {
            duration: 1600,
            ...options,
        });
    }

    fail(message: string = "操作失败，请稍后重试", options?: PromptOptions): void {
        this.show(message, "none", "操作失败，请稍后重试", {
            duration: 2200,
            ...options,
        });
    }

    info(message: string = "请稍后重试", options?: PromptOptions): void {
        this.show(message, "none", "请稍后重试", options);
    }
}

const miniPromptHelper = new MiniPromptHelper();

export default miniPromptHelper;
