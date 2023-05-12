import React from 'react';
import cl from './ZoneForm.module.css'
const ZoneForm = ({children, visible}) => {
    const rootClasses = [cl.ZoneForm]
    if(visible) (
        rootClasses.push(cl.active)
    )
    return (
        <div className={rootClasses.join(' ')}>
            <div className={cl.ZoneFormContent}>
                {children}
            </div>
        </div>
    );
};

export default ZoneForm;