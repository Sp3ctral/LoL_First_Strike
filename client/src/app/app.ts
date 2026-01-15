import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterOutlet } from '@angular/router';
import { Header } from '@layout/header/header';
import { Footer } from '@layout/footer/footer';
import { AuthService } from '@services/auth';

@Component({
    selector: 'app-root',
    imports: [RouterOutlet, Header, Footer],
    templateUrl: './app.html',
    styleUrl: './app.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class App
{
    private authService = inject(AuthService);
    readonly isLoading = this.authService.isLoading;

    constructor() 
    {
        this.authService.checkSession()
            .pipe(takeUntilDestroyed())
            .subscribe();
    }
}
