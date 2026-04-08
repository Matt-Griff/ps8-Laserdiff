const cropImageToContent = (img) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    canvas.width = img.width;
    canvas.height = img.height;

    ctx.drawImage(img, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    let top = null, left = null, right = null, bottom = null;

    for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
        const index = (y * canvas.width + x) * 4;
        const alpha = data[index + 3];

        if (alpha > 0) {
            if (top === null) top = y;
            if (left === null || x < left) left = x;
            if (right === null || x > right) right = x;
            if (bottom === null || y > bottom) bottom = y;
            }
        }
    }

    const width = right - left + 1;
    const height = bottom - top + 1;

    const croppedCanvas = document.createElement("canvas");
    const croppedCtx = croppedCanvas.getContext("2d");

    croppedCanvas.width = width;
    croppedCanvas.height = height;

    croppedCtx.drawImage(
        canvas,
        left, top, width, height,
        0, 0, width, height
    );

    return croppedCanvas.toDataURL();
}

export { cropImageToContent };