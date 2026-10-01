import { Pipe, type PipeTransform } from "@angular/core";
import { getInitials } from "../utils/issue-display.util";

/** {{ user.name | initials }} -> "NA", for avatar circles. */
@Pipe({ name: "initials" })
export class InitialsPipe implements PipeTransform {
  transform(name: string | null | undefined, fallback = "C"): string {
    return getInitials(name, fallback);
  }
}
