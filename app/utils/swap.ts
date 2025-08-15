export function swapRef<T>(a: Ref<T>, b: Ref<T>): void {
    const temp = a.value;
    a.value = b.value;
    b.value = temp;
}
