import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';
import { Header } from '@layout/header/header';
import { Footer } from '@layout/footer/footer';
import { AuthService } from '@services/auth.service';

@Component({
    selector: 'app-root',
    imports: [RouterOutlet, Header],
    templateUrl: './app.html',
    styleUrl: './app.scss'
})
export class App implements OnInit
{
    public authService = inject(AuthService);
    private router = inject(Router);
    
    // Local signal for loading state
    isVerifying = signal(false);

    ngOnInit() 
    {
        this.isVerifying.set(true);
        this.authService.checkSession().subscribe(
        {
            next: (res) => {
                this.authService.isSubscribed.set(res.subscribed);
                if (res.subscribed) 
                {
                    this.router.navigate(['/']);
                }
                this.isVerifying.set(false);
            },
            error: () => {
                this.authService.isSubscribed.set(false);
                this.isVerifying.set(false);
            }
        });
    }
}
