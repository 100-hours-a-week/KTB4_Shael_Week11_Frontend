import { useEffect, useState } from "react";
import { getProtectedImageUrl } from "../api/images";

export function useProtectedImage(path) {
  const [image, setImage] = useState({ path: null, src: "" });
  useEffect(() => {
    let active = true;
    if (path) getProtectedImageUrl(path).then((url) => { if (active) setImage({ path, src: url }); }).catch(() => { if (active) setImage({ path, src: "" }); });
    return () => { active = false; };
  }, [path]);
  return image.path === path ? image.src : "";
}
