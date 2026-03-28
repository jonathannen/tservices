# TServices

TServices is a set of patterns and implementations for dependency injection in TypeScript projects. It follows a handful of basic norms: Services, Dependencies, Instances, and Frames.

## Services and Dependencies

Services consist of:

- `tservices/<service>/types` which are the TypeScript types that define the service interface. Whilst this should aim to be pure types, limited adjacent non-type code such as type assertions are permitted.

- `tservices/<service>/compliance` a compliance suite that can be run against any implementation of the service.

- `tservices/<service>/mock` the default mock implementation of the service that can be used for unit testing scenarios.

- `*tservices/<service>/<impl>` a specific implementation of the service for a particular technology or domain. It should expose a `create<impl><service>` function to instantiate the service.

`create<impl><service>` should take a flat TypeScript interface and a Dependency Interface. This is typically expected to be run on process startup.

Dependency Interface are passed into `create*` methods. They have the other service interfaces this service relies on. This is the mechanism for [Dependency Injection](https://martinfowler.com/articles/injection.html).

Services map most directly to the [Singleton Services](https://learn.microsoft.com/en-us/dotnet/core/extensions/dependency-injection/service-lifetimes#singleton) in C#.

## Instances and Frames

Whilst services may be used directly, some functions will return instance. These are effectively interfaces that are scoped by some contextual parameters. For example, the LoggerService may emit a LoggerInstance that has additional annotations.

Frame Interfaces are the complement to Dependency Interface. Instead of containing Services, it contains Instances.

Instances map most directly to the [Scoped Services](https://learn.microsoft.com/en-us/dotnet/core/extensions/dependency-injection/service-lifetimes#scoped) in C#.
