import { getProfileFrameImg } from '../../utils/profileFrames';

// Decorative frame image overlaid around an avatar. Must be placed inside a
// `position: relative` container; the avatar shows through the frame's hole.
export const ProfileFrameOverlay = ({
    frameKey,
    sizeClass = 'h-[165%] w-[165%]',
}: {
    frameKey: string | null | undefined;
    sizeClass?: string;
}) => {
    const img = getProfileFrameImg(frameKey);
    if (!img) return null;
    return (
        <img
            src={img}
            alt=""
            aria-hidden="true"
            className={`pointer-events-none absolute left-1/2 top-1/2 max-w-none -translate-x-1/2 -translate-y-1/2 object-contain ${sizeClass}`}
        />
    );
};
