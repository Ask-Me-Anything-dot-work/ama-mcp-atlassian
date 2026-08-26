export function toADF(plainText: string) {
  return {
    type: "doc" as const,
    version: 1,
    content: [
      {
        type: "paragraph" as const,
        content: [{ type: "text" as const, text: plainText }],
      },
    ],
  };
}
