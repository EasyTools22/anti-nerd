/** Lightweight editorial product illustrations. No external images or requests. */
export function ProductSilhouette({ variant = 0 }: { variant?: number }) {
  return (
    <svg
      className="product-silhouette"
      viewBox="0 0 180 200"
      aria-hidden="true"
    >
      {variant === 1 ? (
        <>
          <path
            d="M58 29 36 38 13 92 37 105 49 77 42 177 138 177 131 77 143 105 167 92 144 38 122 29 90 44Z"
            fill="currentColor"
          />
          <path
            d="M60 30 90 55 122 30M90 55V177M52 85H77V112H52M103 85H127V112H103"
            fill="none"
            stroke="var(--store-paper)"
            strokeWidth="2"
            opacity=".6"
          />
          {[76, 100, 124, 148].map((y) => (
            <circle key={y} cx="94" cy={y} r="2" fill="var(--store-paper)" />
          ))}
        </>
      ) : (
        <>
          <path
            d={
              variant === 2
                ? "M33 79Q90 52 147 79L166 162Q90 185 14 162Z"
                : "M40 67 140 67 151 175Q90 190 29 175Z"
            }
            fill="currentColor"
          />
          <path
            d="M62 82V49C62 15 118 15 118 49V82"
            fill="none"
            stroke="currentColor"
            strokeWidth="10"
          />
          <path
            d="M44 86 39 170M136 86 142 170"
            stroke="var(--store-paper)"
            strokeWidth="1"
            opacity=".5"
          />
          <path d="M80 124h20v16H80z" fill="var(--store-paper)" opacity=".65" />
        </>
      )}
    </svg>
  );
}
