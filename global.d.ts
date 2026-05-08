// Augment React types so legacy <style jsx> blocks (used in some views)
// don't break the strict TypeScript build.
import 'react';

declare module 'react' {
  namespace JSX {
    interface IntrinsicAttributes {
      jsx?: boolean;
      global?: boolean;
    }
  }
}

declare global {
  namespace React {
    interface StyleHTMLAttributes<T> {
      jsx?: boolean;
      global?: boolean;
    }
  }
}

export {};
