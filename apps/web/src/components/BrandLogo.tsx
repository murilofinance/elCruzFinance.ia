type BrandLogoProps = {
  size: 'login' | 'header';
};

const SIZE = {
  login: 'h-44 w-auto object-contain sm:h-52',
  header: 'h-14 w-auto object-contain sm:h-16',
} as const;

export function BrandLogo({ size }: BrandLogoProps) {
  return (
    <img
      src="/brand/icon.png"
      alt="ElCruz Finance.AI"
      width={480}
      height={560}
      className={SIZE[size]}
    />
  );
}
