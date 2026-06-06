type NoteIconProps = {
    className?: string;
};

const NoteIcon = ({ className = 'h-6 w-6' }: NoteIconProps) => (
    <svg
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        aria-hidden="true"
    >
        <path
            d="M7 5.5H18.5C19.3284 5.5 20 6.17157 20 7V25C20 25.8284 19.3284 26.5 18.5 26.5H7C6.17157 26.5 5.5 25.8284 5.5 25V7C5.5 6.17157 6.17157 5.5 7 5.5Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <path d="M10 12H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M10 17H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M10 22H14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path
            d="M20.5 4.5L24 8L17 15L13.5 15.5L14 12L20.5 4.5Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);

export { NoteIcon };
