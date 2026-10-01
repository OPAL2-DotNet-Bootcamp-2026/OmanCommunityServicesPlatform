import { Component } from "@angular/core";
import { RouterOutlet } from "@angular/router";

/** The page shell. Every routed page renders inside the router outlet. */
@Component({
  selector: "ocsp-root",
  imports: [RouterOutlet],
  templateUrl: "./app.component.html"
})
export class AppComponent {}
