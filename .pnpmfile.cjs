module.exports = {
  hooks: {
    readPackage: (pkg) => {
      if (!pkg.name) {
        return pkg;
      }
      // make exiftool-vendored.pl a regular dependency since Docker prod
      // images build with --no-optional to reduce image size
      if (pkg.name === "exiftool-vendored") {
        if (pkg.optionalDependencies["exiftool-vendored.pl"]) {
          pkg.dependencies["exiftool-vendored.pl"] =
            pkg.optionalDependencies["exiftool-vendored.pl"];
          delete pkg.optionalDependencies["exiftool-vendored.pl"];
        }
      }
      return pkg;
    },
  },
};
