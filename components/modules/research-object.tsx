export function ResearchObject({ kind }: { kind: string }) {
  return (
    <svg className="research-object" viewBox="0 0 300 220" aria-hidden="true">
      <ellipse
        cx="154"
        cy="187"
        rx="83"
        ry="10"
        className="research-object-shadow"
      />
      {kind === "organizer" ? (
        <g transform="rotate(-12 150 115)">
          <path
            d="M76 62Q148 47 222 67L229 155Q151 185 73 157Z"
            fill="var(--object-body)"
          />
          <path
            d="M80 75Q156 55 218 78L222 143Q155 163 80 145Z"
            fill="var(--object-face)"
          />
          <path
            d="M83 87Q149 69 218 90"
            stroke="var(--object-highlight)"
            strokeWidth="3"
            fill="none"
          />
          <rect
            x="184"
            y="86"
            width="12"
            height="18"
            rx="3"
            fill="var(--object-highlight)"
          />
          <path
            d="M104 112 105 143M120 108 121 143M137 106 138 146"
            stroke="var(--object-body)"
            strokeWidth="2"
          />
          <rect
            x="160"
            y="114"
            width="37"
            height="19"
            rx="2"
            fill="var(--object-body)"
          />
          <text
            x="178"
            y="127"
            textAnchor="middle"
            fill="var(--object-highlight)"
            fontSize="7"
            letterSpacing="2"
          >
            GO
          </text>
        </g>
      ) : kind === "lamp" ? (
        <g>
          <ellipse
            cx="150"
            cy="176"
            rx="47"
            ry="11"
            fill="var(--object-body)"
          />
          <rect
            x="144"
            y="92"
            width="12"
            height="85"
            rx="5"
            fill="var(--object-face)"
          />
          <path
            d="M97 91 120 39Q150 25 181 39L203 91Z"
            fill="var(--object-face)"
          />
          <ellipse cx="150" cy="91" rx="53" ry="11" fill="var(--object-body)" />
          <ellipse
            cx="150"
            cy="90"
            rx="40"
            ry="6"
            fill="var(--object-highlight)"
          />
          <path
            d="M116 83 131 43"
            stroke="var(--object-highlight)"
            strokeWidth="2"
            opacity=".4"
          />
        </g>
      ) : (
        <g>
          <path
            d="M62 119Q148 167 239 119L227 161Q150 204 75 160Z"
            fill="var(--object-body)"
          />
          <ellipse
            cx="150"
            cy="120"
            rx="88"
            ry="42"
            fill="var(--object-face)"
          />
          <ellipse
            cx="150"
            cy="120"
            rx="72"
            ry="29"
            fill="var(--object-body)"
          />
          <path
            d="M102 105Q150 83 193 109M95 126Q139 98 193 133M122 144Q147 122 181 144"
            stroke="var(--object-highlight)"
            strokeWidth="8"
            strokeLinecap="round"
            fill="none"
          />
        </g>
      )}
    </svg>
  );
}
