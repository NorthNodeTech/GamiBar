/** Stop every active camera track under `root` (or the whole document). */
export function releaseAllCameraStreams(root: ParentNode = document) {
  root.querySelectorAll("video").forEach((video) => {
    const stream = video.srcObject;
    if (stream instanceof MediaStream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    video.srcObject = null;
  });
}
