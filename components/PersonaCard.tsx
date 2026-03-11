import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppState } from "@/app/page";
import { personas } from "@/app/page";

type PersonaCardProps = {
    onSelect: (persona: AppState['persona']) => void;
    selectedPersona: AppState['persona']
}

export const PersonaCard = ({ onSelect, selectedPersona }: PersonaCardProps ) => {

    return (
        <section>
            <Card>
                <CardHeader>
                <CardTitle>Choose your persona</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="flex items-center gap-4">
                        { personas.map((p) => (
                            <div className="flex items-center gap-2" key={p.type}>
                                <input id={ `persona-${ p.type }` } type='radio' name='persona' value={ p.type } onChange={(e) => onSelect(e.target.value as AppState['persona'])} checked={ selectedPersona === p.type }/>
                                <label htmlFor={ `persona-${ p.type }` }>{ p.label }</label>
                            </div>
                            )
                        )}
                    </div>
                </CardContent>
            </Card>
        </section>
    )

}
